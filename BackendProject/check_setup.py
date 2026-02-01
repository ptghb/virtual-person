#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
WebSocket 图片消息功能启动和测试脚本
"""

import sys
import os
import subprocess
import time

def check_dependencies():
    """检查必要的依赖"""
    required_packages = ['fastapi', 'uvicorn', 'websockets', 'pillow', 'zhipuai']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package} 已安装")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package} 未安装")
    
    if missing_packages:
        print(f"\n请安装缺失的包: pip install {' '.join(missing_packages)}")
        return False
    return True

def check_env_config():
    """检查环境配置"""
    from dotenv import load_dotenv
    load_dotenv()
    
    zhipuai_key = os.getenv('ZHIPUAI_API_KEY')
    if not zhipuai_key or zhipuai_key == 'your_zhipuai_api_key_here':
        print("⚠️  警告: 未配置有效的ZHIPUAI_API_KEY")
        print("   请在.env文件中设置正确的API密钥")
        return False
    
    print("✅ 环境配置检查通过")
    return True

def start_server():
    """启动WebSocket服务器"""
    print("🚀 启动WebSocket服务器...")
    try:
        # 使用subprocess启动服务器
        process = subprocess.Popen([
            sys.executable, '-u', 'main.py'
        ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, 
           universal_newlines=True, bufsize=1)
        
        # 等待服务器启动
        time.sleep(3)
        
        if process.poll() is None:
            print("✅ 服务器启动成功")
            return process
        else:
            print("❌ 服务器启动失败")
            return None
            
    except Exception as e:
        print(f"❌ 启动服务器时出错: {e}")
        return None

def test_imports():
    """测试模块导入"""
    print("🧪 测试模块导入...")
    
    try:
        import main
        print("✅ main 模块导入成功")
    except Exception as e:
        print(f"❌ main 模块导入失败: {e}")
        return False
    
    try:
        import image_handler
        print("✅ image_handler 模块导入成功")
    except Exception as e:
        print(f"❌ image_handler 模块导入失败: {e}")
        return False
        
    try:
        from audio_handler import message_parser
        print("✅ audio_handler 模块导入成功")
    except Exception as e:
        print(f"❌ audio_handler 模块导入失败: {e}")
        return False
    
    return True

def main():
    print("=" * 50)
    print("WebSocket 图片消息功能测试")
    print("=" * 50)
    
    # 1. 检查依赖
    print("\n1. 检查依赖...")
    if not check_dependencies():
        return
    
    # 2. 检查环境配置
    print("\n2. 检查环境配置...")
    if not check_env_config():
        print("⚠️  继续测试基础功能...")
    
    # 3. 测试模块导入
    print("\n3. 测试模块导入...")
    if not test_imports():
        print("❌ 模块导入测试失败")
        return
    
    print("\n✅ 所有基础检查通过!")
    print("\n💡 下一步:")
    print("   1. 运行 'python main.py' 启动服务器")
    print("   2. 打开 'test_image_client.html' 进行测试")
    print("   3. 或运行 'python test_image_message.py' 进行自动化测试")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    main()