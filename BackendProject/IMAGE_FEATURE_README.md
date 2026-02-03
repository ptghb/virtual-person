# WebSocket 图片消息功能说明

## 功能概述

本项目现已支持通过WebSocket接收和处理图片消息。当服务器接收到图片消息时，会自动调用智谱AI的GLM-4V-Flash模型来分析图片内容，并将分析结果打印到日志中。

## 环境配置

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

需要额外安装的依赖：
- `pillow>=10.0.0` - 图片处理库
- `zhipuai>=2.0.0` - 智谱AI官方SDK

### 2. 配置API密钥
在 `.env` 文件中添加智谱AI的API密钥：

```env
# 智谱AI GLM-4V API配置
ZHIPUAI_API_KEY=your_actual_zhipuai_api_key_here
```

## 使用方法

### 1. 启动服务器
```bash
python main.py
```

服务器将在 `http://localhost:8000` 启动。

### 2. 发送图片消息

#### 消息格式
```json
{
  "type": "image",
  "data": {
    "image": "base64_encoded_image_data",
    "format": "jpeg",
    "timestamp": "2024-01-01T12:00:00Z",
    "client_id": "user123"
  }
}
```

#### 字段说明
- `type`: 消息类型，必须为 "image"
- `data.image`: 图片的base64编码数据
- `data.format`: 图片格式（jpeg, png, gif, webp）
- `data.timestamp`: 时间戳
- `data.client_id`: 客户端标识

### 3. 测试方式

#### 方式一：使用HTML测试客户端
打开 `test_image_client.html` 文件，在浏览器中运行：
1. 输入客户端ID
2. 点击"连接WebSocket"
3. 选择图片文件
4. 点击"发送图片"
5. 查看日志输出

#### 方式二：使用Python测试脚本
```bash
python test_image_message.py
```

该脚本会：
1. 自动创建测试图片
2. 连接到WebSocket服务器
3. 发送图片消息
4. 显示服务器响应和AI分析结果

## 功能特性

### 支持的图片格式
- JPEG
- PNG  
- GIF
- WEBP

### 图片处理流程
1. 接收base64编码的图片数据
2. 验证图片格式和完整性
3. 调用GLM-4V-Flash模型分析图片
4. 将分析结果打印到服务器日志
5. 返回处理结果给客户端
6. 同时发送AI描述作为聊天消息

### 日志输出示例
```
[ImageProcessor] 接收到图片数据，大小: 153600 字节
[ImageProcessor] 图片格式验证通过: JPEG
[ImageProcessor] GLM-4V-Flash分析完成
[ImageProcessor] 图片分析结果: 这是一张包含红色背景和蓝色正方形的测试图片，中央有一个黄色圆形...
[ImageProcessor] 分析时间: 2024-01-01 12:00:00
```

## 错误处理

系统会处理以下错误情况：
- 图片数据为空或格式错误
- 不支持的图片格式
- GLM-4V-Flash API调用失败
- 网络连接问题

错误信息会通过WebSocket响应返回给客户端。

## 性能说明

- 图片大小限制：建议不超过10MB
- 处理时间：通常在5-15秒内完成
- 并发支持：支持多个客户端同时发送图片

## 注意事项

1. 确保已正确配置智谱AI API密钥
2. 图片需要base64编码后发送
3. 大图片可能需要较长时间处理
4. 服务器日志会记录所有图片分析结果
5. 建议在生产环境中添加适当的缓存机制

## API文档

完整的WebSocket通信协议请参考 [protocol.md](protocol.md) 文件。