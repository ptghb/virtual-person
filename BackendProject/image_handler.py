# -*- coding: utf-8 -*-
import base64
import json
from typing import Dict
import asyncio
from datetime import datetime
import os
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class ImageProcessor:
    def __init__(self):
        pass

    async def process_image_message(self, image_data: dict) -> Dict:
        """处理图片消息"""
        try:
            image_base64 = image_data.get("image", "")
            if not image_base64:
                return {"status": "error", "message": "图片数据为空"}

            # 解码base64图片数据
            try:
                image_bytes = base64.b64decode(image_base64)
                print(f"[ImageProcessor] 接收到图片数据，大小: {len(image_bytes)} 字节")
            except Exception as e:
                return {"status": "error", "message": f"图片解码失败: {str(e)}"}

            # 验证图片格式
            if not self._validate_image_format(image_bytes):
                return {"status": "error", "message": "不支持的图片格式"}

            # 调用GLM-4V-Flash分析图片
            from services.llm_service import llm_service
            analysis_result = await self._analyze_image_with_glm4v(image_bytes, llm_service)

            if analysis_result["status"] == "success":
                # 打印分析结果到日志
                print(f"[ImageProcessor] 图片分析结果: {analysis_result['description']}")
                print(f"[ImageProcessor] 分析时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

                return {
                    "status": "success",
                    "message": "图片处理完成",
                    "description": analysis_result["description"],
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return analysis_result

        except Exception as e:
            error_msg = f"图片处理失败: {str(e)}"
            print(f"[ImageProcessor] {error_msg}")
            return {"status": "error", "message": error_msg}

    def _validate_image_format(self, image_bytes: bytes) -> bool:
        """验证图片格式"""
        try:
            image = Image.open(BytesIO(image_bytes))
            # 支持常见图片格式
            supported_formats = ['JPEG', 'PNG', 'GIF', 'WEBP']
            if image.format.upper() in supported_formats:
                print(f"[ImageProcessor] 图片格式验证通过: {image.format}")
                return True
            else:
                print(f"[ImageProcessor] 不支持的图片格式: {image.format}")
                return False
        except Exception as e:
            print(f"[ImageProcessor] 图片格式验证失败: {str(e)}")
            return False

    async def _analyze_image_with_glm4v(self, image_bytes: bytes, llm_service) -> Dict:
        """使用GLM-4V-Flash分析图片"""
        try:
            # 调用服务层的图片分析方法
            description = await llm_service.analyze_image(image_bytes)

            print(f"[ImageProcessor] GLM-4V-Flash分析完成")
            return {
                "status": "success",
                "description": description
            }
        except Exception as e:
            error_msg = f"GLM-4V-Flash调用失败: {str(e)}"
            print(f"[ImageProcessor] {error_msg}")
            return {"status": "error", "message": error_msg}

    async def save_image_file(self, client_id: str, image_bytes: bytes) -> str:
        """保存图片到本地文件"""
        try:
            # 创建图片目录
            image_dir = "image_files"
            if not os.path.exists(image_dir):
                os.makedirs(image_dir)

            # 生成文件名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{image_dir}/image_{client_id}_{timestamp}.jpg"

            # 保存文件
            with open(filename, "wb") as f:
                f.write(image_bytes)

            print(f"[ImageProcessor] 图片已保存到: {filename}")
            return filename

        except Exception as e:
            print(f"[ImageProcessor] 图片保存失败: {str(e)}")
            return ""

class ImageMessageParser:
    @staticmethod
    def parse_image_message(raw_data: str) -> tuple[dict, str]:
        """解析图片消息"""
        try:
            message_obj = json.loads(raw_data)
            msg_type = message_obj.get("type", "")
            msg_data = message_obj.get("data", {})

            if msg_type != "image":
                return {}, "消息类型不是图片"

            if "image" not in msg_data:
                return {}, "图片消息缺少image字段"

            # 可选字段验证
            image_data = msg_data.get("image", "")
            if not isinstance(image_data, str) or len(image_data) == 0:
                return {}, "图片数据格式错误"

            return msg_data, ""

        except json.JSONDecodeError:
            return {}, "JSON格式错误"
        except Exception as e:
            return {}, f"消息解析错误: {str(e)}"

# 创建全局实例
image_processor = ImageProcessor()
image_message_parser = ImageMessageParser()
