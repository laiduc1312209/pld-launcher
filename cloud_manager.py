"""
PLD Launcher — Backblaze B2 Configuration (High-Speed & No Card Required)
Handles file synchronization using S3-compatible API.
"""
import os
import boto3
from botocore.config import Config
from config import B2_KEY_ID, B2_APPLICATION_KEY, B2_ENDPOINT, B2_BUCKET_NAME

class CloudManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CloudManager, cls).__new__(cls)
            # Configure S3 client for Backblaze B2
            cls._instance.s3 = boto3.client(
                service_name='s3',
                endpoint_url=f"https://{B2_ENDPOINT}",
                aws_access_key_id=B2_KEY_ID,
                aws_secret_access_key=B2_APPLICATION_KEY,
                region_name='us-west-004', # Sẽ được update tự động từ endpoint
                config=Config(s3={'addressing_style': 'path'}) # Backblaze khuyên dùng path-style
            )
        return cls._instance

    def upload_file(self, local_path, cloud_filename):
        """
        Uploads a file to Backblaze B2.
        """
        if B2_KEY_ID == "YOUR_KEY_ID":
            return False, "Chưa cấu hình Backblaze B2 Key ID."

        try:
            self.s3.upload_file(local_path, B2_BUCKET_NAME, cloud_filename)
            return True, "Upload thành công."
        except Exception as e:
            return False, f"B2 Upload Error: {str(e)}"

    def download_file(self, cloud_filename, dest_path):
        """
        Downloads a file from Backblaze B2.
        """
        if B2_KEY_ID == "YOUR_KEY_ID":
            return False, "Chưa cấu hình Backblaze B2 Key ID."

        try:
            self.s3.download_file(B2_BUCKET_NAME, cloud_filename, dest_path)
            return True, "Download thành công."
        except Exception as e:
            return False, f"B2 Download Error: {str(e)}"

    def list_files(self):
        """Lists files in the bucket (optional debug utility)."""
        try:
            response = self.s3.list_objects_v2(Bucket=B2_BUCKET_NAME)
            return [obj['Key'] for obj in response.get('Contents', [])]
        except:
            return []
