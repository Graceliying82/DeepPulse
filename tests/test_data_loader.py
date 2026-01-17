import unittest
from unittest.mock import patch, MagicMock
import sys
import os
import shutil

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from data_loader import download_sample_data, get_available_patients, ensure_data_dir, clean_data_directory

class TestDataLoader(unittest.TestCase):
    
    def setUp(self):
        self.test_dir = os.path.join(os.path.dirname(__file__), 'test_data_temp')
    
    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_ensure_data_dir(self):
        ensure_data_dir(self.test_dir)
        self.assertTrue(os.path.exists(self.test_dir))

    @patch('data_loader.wfdb')
    def test_download_sample_data(self, mock_wfdb):
        # Setup mocks
        mock_wfdb.get_record_list.return_value = ['patient0/rec0', 'patient1/rec1', 'patient2/rec2']
        
        # Run function
        download_sample_data(db_slug='testdb', num_records=2, random_shuffle=False, data_dir=self.test_dir)
        
        # Verify wfdb calls
        mock_wfdb.get_record_list.assert_called_with('testdb')
        mock_wfdb.dl_database.assert_called()
        
        # Verify args passed to dl_database
        call_args = mock_wfdb.dl_database.call_args
        self.assertEqual(call_args[0][0], 'testdb') # slug
        self.assertEqual(call_args[0][1], self.test_dir) # target dir
        self.assertEqual(len(call_args[0][2]), 2) # num records

    def test_clean_data_directory(self):
        ensure_data_dir(self.test_dir)
        # Create a dummy file
        with open(os.path.join(self.test_dir, 'dummy.txt'), 'w') as f:
            f.write("test")
            
        clean_data_directory(self.test_dir)
        
        self.assertTrue(os.path.exists(self.test_dir))
        self.assertFalse(os.path.exists(os.path.join(self.test_dir, 'dummy.txt')))

if __name__ == '__main__':
    unittest.main()
