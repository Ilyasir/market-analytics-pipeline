import asyncio
import os

import boto3
import catboost
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()


class S3Service:
    def __init__(self):
        self.model = None
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=os.getenv("MINIO_ENDPOINT"),
            aws_access_key_id=os.getenv("MINIO_ROOT_USER"),
            aws_secret_access_key=os.getenv("MINIO_ROOT_PASSWORD"),
            config=boto3.session.Config(signature_version="s3v4"),
            region_name="us-east-1",
        )

    async def load_model(self, bucket="ml-data", key="models/model_2026-04-01.cbm"):
        def _sync_load():
            try:
                response = self.s3_client.get_object(Bucket=bucket, Key=key)
                model_data = response["Body"].read()

                temp_path = "temp_model.cbm"
                with open(temp_path, "wb") as f:
                    f.write(model_data)

                model = catboost.CatBoostRegressor()
                model.load_model(temp_path)

                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return model
            except (ClientError, self.s3_client.exceptions.NoSuchKey):
                return None
            except Exception as e:
                print(f"❌ Ошибка загрузки: {e}")
                return None

        loop = asyncio.get_event_loop()
        loaded_model = await loop.run_in_executor(None, _sync_load)

        if loaded_model:
            self.model = loaded_model
            print(f"✅ Модель {key} подгружена.")
        else:
            print(f"⚠️ Модель {key} не найдена. Predict будет возвращать None.")

    def predict(self, features):
        if self.model is None:
            return None
        return self.model.predict(features)

    def upload_file(self, file_content: bytes, bucket: str, s3_key: str, content_type: str):
        try:
            self.s3_client.put_object(Bucket=bucket, Key=s3_key, Body=file_content, ContentType=content_type)
            return f"{os.getenv('MINIO_PUBLIC_URL')}/{bucket}/{s3_key}"
        except ClientError as e:
            print(f"❌ Ошибка при загрузке файла в S3: {e}")
            return None


s3_service = S3Service()
