from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
import torch
import torch.nn as nn
import numpy as np
import cv2
from PIL import Image
import io
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

app = FastAPI()

# Model architecture
class MLP(nn.Module):
    def __init__(self, input_dim, num_classes):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        return self.net(x)

# Model load karo
checkpoint = torch.load('best_mlp.pth', map_location='cpu', weights_only=False)
labels = checkpoint['labels']
model = MLP(63, len(labels))
model.load_state_dict(checkpoint['model_state_dict'])
model.eval()

# MediaPipe new API
base_options = python.BaseOptions(model_asset_path='hand_landmarker.task')
options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=1)
detector = vision.HandLandmarker.create_from_options(options)

@app.post('/predict')
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert('RGB')
    frame = np.array(image)

    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
    results = detector.detect(mp_image)

    if not results.hand_landmarks:
        return {'prediction': None, 'message': 'No hand detected'}

    landmarks = []
    for lm in results.hand_landmarks[0]:
        landmarks.extend([lm.x, lm.y, lm.z])

    input_tensor = torch.tensor([landmarks], dtype=torch.float32)
    with torch.no_grad():
        output = model(input_tensor)
        predicted_index = torch.argmax(output, dim=1).item()
        predicted_label = labels[predicted_index]
        
    with torch.no_grad():
        output = model(input_tensor)
        probs = torch.softmax(output, dim=1)
        confidence, predicted_index = torch.max(probs, dim=1)
        
        CONFIDENCE_THRESHOLD = 0.75
        
        if confidence.item() < CONFIDENCE_THRESHOLD:
            return {'prediction': None, 'message': 'No confident sign detected', 'confidence': round(confidence.item(), 3)}
        
        predicted_label = labels[predicted_index.item()]
        return {'prediction': str(predicted_label), 'confidence': round(confidence.item(), 3)}