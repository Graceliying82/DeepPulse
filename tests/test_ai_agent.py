import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from ai_agent import analyze_ecg, recommend_databases

class TestAIAgent(unittest.TestCase):

    @patch('ai_agent.genai')
    @patch('ai_agent.Image.open')
    @patch('ai_agent.os.getenv')
    @patch('ai_agent.st.secrets', new_callable=dict) # Mock secrets
    def test_analyze_ecg_full_mode(self, mock_secrets, mock_getenv, mock_img_open, mock_genai):
        # Setup
        mock_getenv.return_value = "fake_key"
        
        # Mock Client and models
        mock_client = MagicMock()
        mock_genai.Client.return_value = mock_client
        mock_client.models.generate_content.return_value.text = "Analysis Result"
        
        # Run
        result = analyze_ecg(None, user_notes="Some notes", mode="full")
        
        # Verify
        mock_genai.Client.assert_called_with(api_key="fake_key")
        
        # Check generate_content call
        kwargs = mock_client.models.generate_content.call_args
        self.assertEqual(kwargs.kwargs['model'], 'gemini-3-flash-preview')
        
        contents = kwargs.kwargs['contents']
        prompt_text = contents[0]
        
        self.assertIn("The user has provided the following observations/hints: \"Some notes\"", prompt_text)
        self.assertIn("Please perform the full clinical analysis", prompt_text)

    @patch('ai_agent.genai')
    @patch('ai_agent.Image.open')
    @patch('ai_agent.os.getenv')
    def test_analyze_ecg_hints_mode(self, mock_getenv, mock_img_open, mock_genai):
        # Setup
        mock_getenv.return_value = "fake_key"
        mock_client = MagicMock()
        mock_genai.Client.return_value = mock_client
        
        # Run
        analyze_ecg(None, user_notes="", mode="hints")
        
        # Check prompt content
        kwargs = mock_client.models.generate_content.call_args
        contents = kwargs.kwargs['contents']
        prompt_text = contents[0]
        
        self.assertIn("Please provide **HINTS ONLY**", prompt_text)
        self.assertIn("**DO NOT** state the final diagnosis", prompt_text)

    @patch('ai_agent.genai')
    @patch('ai_agent.Image.open')
    @patch('ai_agent.os.getenv')
    def test_analyze_ecg_quiz_mode(self, mock_getenv, mock_img_open, mock_genai):
        # Setup
        mock_getenv.return_value = "fake_key"
        mock_client = MagicMock()
        mock_genai.Client.return_value = mock_client
        
        # Mock JSON response
        mock_response = '[{"diagnosis": "AFib", "is_correct": true, "explanation": "Irregularly irregular"}, {"diagnosis": "Flutter", "is_correct": false, "explanation": "Sawtooth"}]'
        mock_client.models.generate_content.return_value.text = mock_response
        
        # Run
        result = analyze_ecg(None, user_notes="", mode="quiz")
        
        # Verify
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['diagnosis'], "AFib")
        self.assertTrue(result[0]['is_correct'])
        
        # Check prompt has JSON instruction
        kwargs = mock_client.models.generate_content.call_args
        contents = kwargs.kwargs['contents']
        prompt_text = contents[0]
        self.assertIn("VALID JSON ARRAY", prompt_text)

    @patch('ai_agent.genai')
    @patch('ai_agent.Image.open')
    @patch('ai_agent.os.getenv')
    def test_analyze_ecg_rate_limit(self, mock_getenv, mock_img_open, mock_genai):
        # Setup
        mock_getenv.return_value = "fake_key"
        mock_client = MagicMock()
        mock_genai.Client.return_value = mock_client
        
        # Mock 429 Error
        mock_client.models.generate_content.side_effect = Exception("429 RESOURCE_EXHAUSTED")
        
        # Run Normal Mode
        result = analyze_ecg(None, user_notes="", mode="full")
        self.assertIn("AI Quota Exceeded", result)
        
        # Run Quiz Mode
        result_quiz = analyze_ecg(None, user_notes="", mode="quiz")
        self.assertIsInstance(result_quiz, dict)
        self.assertEqual(result_quiz['error'], "quota_exceeded")
        self.assertIn("AI Daily Quota Exceeded", result_quiz['message'])

    @patch('ai_agent.genai')
    @patch('ai_agent.os.getenv')
    def test_recommend_databases(self, mock_getenv, mock_genai):
         # Setup
        mock_getenv.return_value = "fake_key"
        mock_client = MagicMock()
        mock_genai.Client.return_value = mock_client
        mock_client.models.generate_content.return_value.text = '[{"name": "Test DB", "slug": "testdb", "description": "desc"}]'
        
        # Run
        recs = recommend_databases("topic")
        
        self.assertEqual(len(recs), 1)
        self.assertEqual(recs[0]['slug'], 'testdb')
        
        kwargs = mock_client.models.generate_content.call_args
        self.assertEqual(kwargs.kwargs['model'], 'gemini-3-flash-preview')

if __name__ == '__main__':
    unittest.main()
