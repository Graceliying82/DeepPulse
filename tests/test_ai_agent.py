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
        mock_model = MagicMock()
        mock_genai.GenerativeModel.return_value = mock_model
        mock_model.generate_content.return_value.text = "Analysis Result"
        
        # Run
        result = analyze_ecg(None, user_notes="Some notes", mode="full")
        
        # Verify
        mock_genai.configure.assert_called_with(api_key="fake_key")
        mock_genai.GenerativeModel.assert_called_with('gemini-3-flash-preview')
        
        # Check prompt content
        kwargs = mock_model.generate_content.call_args
        prompt_list = kwargs[0][0] # First arg is list [prompt, img]
        prompt_text = prompt_list[0]
        
        self.assertIn("The user has provided the following observations/hints: \"Some notes\"", prompt_text)
        self.assertIn("Please perform the full clinical analysis", prompt_text)

    @patch('ai_agent.genai')
    @patch('ai_agent.Image.open')
    @patch('ai_agent.os.getenv')
    def test_analyze_ecg_hints_mode(self, mock_getenv, mock_img_open, mock_genai):
        # Setup
        mock_getenv.return_value = "fake_key"
        mock_model = MagicMock()
        mock_genai.GenerativeModel.return_value = mock_model
        
        # Run
        analyze_ecg(None, user_notes="", mode="hints")
        
        # Check prompt content
        kwargs = mock_model.generate_content.call_args
        prompt_list = kwargs[0][0]
        prompt_text = prompt_list[0]
        
        self.assertIn("Please provide **HINTS ONLY**", prompt_text)
        self.assertIn("**DO NOT** state the final diagnosis", prompt_text)

    @patch('ai_agent.genai')
    @patch('ai_agent.os.getenv')
    def test_recommend_databases(self, mock_getenv, mock_genai):
         # Setup
        mock_getenv.return_value = "fake_key"
        mock_model = MagicMock()
        mock_genai.GenerativeModel.return_value = mock_model
        mock_model.generate_content.return_value.text = '[{"name": "Test DB", "slug": "testdb", "description": "desc"}]'
        
        # Run
        recs = recommend_databases("topic")
        
        self.assertEqual(len(recs), 1)
        self.assertEqual(recs[0]['slug'], 'testdb')
        mock_genai.GenerativeModel.assert_called_with('gemini-3-flash-preview')

if __name__ == '__main__':
    unittest.main()
