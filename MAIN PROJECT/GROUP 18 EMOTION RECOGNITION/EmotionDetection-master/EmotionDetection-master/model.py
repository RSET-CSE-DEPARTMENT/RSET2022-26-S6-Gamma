"""
Model Architecture — ImprovedHybridProjectionFusionLLM
Exact copy from Kaggle validation notebook. DO NOT MODIFY.
"""

import os
import sys

_torch_pkgs = r"C:\Users\VolwinSHAJI\torch_pkgs"
if os.path.isdir(_torch_pkgs) and _torch_pkgs not in sys.path:
    sys.path.insert(0, _torch_pkgs)

import torch
import torch.nn as nn
import torchvision.models as models
from transformers import AutoTokenizer, AutoModel


class Audio2DEncoder(nn.Module):
    def __init__(self, output_dim=256, dropout=0.5):
        super().__init__()

        weights = models.ResNet18_Weights.DEFAULT
        self.backbone = models.resnet18(weights=weights)

        original_conv1 = self.backbone.conv1
        self.backbone.conv1 = nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
        with torch.no_grad():
            self.backbone.conv1.weight.copy_(original_conv1.weight.mean(dim=1, keepdim=True))

        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(in_features, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(512, output_dim),
            nn.BatchNorm1d(output_dim)
        )

    def forward(self, x):
        return self.backbone(x)


class Video3DEncoder(nn.Module):
    def __init__(self, output_dim=256, dropout=0.5):
        super().__init__()

        from torchvision.models.video import r3d_18, R3D_18_Weights

        weights = R3D_18_Weights.KINETICS400_V1
        self.backbone = r3d_18(weights=weights)

        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(in_features, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(512, output_dim),
            nn.BatchNorm1d(output_dim)
        )

    def forward(self, x):
        return self.backbone(x)


class ImprovedHybridProjectionFusionLLM(nn.Module):
    def __init__(self, num_classes=8, deep_feature_dim=256,
                 num_blendshapes=52, num_prosody=88,
                 pretrained_model_path=None, dropout=0.4,
                 freeze_deep=True, freeze_llm_layers=4):
        super().__init__()

        self.audio_encoder = Audio2DEncoder(output_dim=deep_feature_dim, dropout=dropout)
        self.video_encoder = Video3DEncoder(output_dim=deep_feature_dim, dropout=dropout)

        self.blendshape_encoder = nn.Sequential(
            nn.Linear(num_blendshapes, 128),
            nn.LayerNorm(128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 64),
            nn.LayerNorm(64)
        )

        self.prosody_encoder = nn.Sequential(
            nn.Linear(num_prosody, 128),
            nn.LayerNorm(128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 64),
            nn.LayerNorm(64)
        )

        self.feature_dropout = nn.Dropout(dropout)

        llm_hidden_size = 768
        deep_combined_dim = deep_feature_dim * 2

        self.deep_projection = nn.Sequential(
            nn.Linear(deep_combined_dim, 512),
            nn.LayerNorm(512),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(512, llm_hidden_size),
            nn.LayerNorm(llm_hidden_size),
            nn.Dropout(dropout * 0.5)
        )

        print("Loading DistilRoBERTa tokenizer and model...")
        self.tokenizer = AutoTokenizer.from_pretrained('distilroberta-base')
        self.llm = AutoModel.from_pretrained('distilroberta-base')

        fusion_input_dim = llm_hidden_size + 64 + 64 + llm_hidden_size

        self.fusion_attention = nn.Sequential(
            nn.Linear(fusion_input_dim, fusion_input_dim // 4),
            nn.Tanh(),
            nn.Linear(fusion_input_dim // 4, fusion_input_dim),
            nn.Sigmoid()
        )

        self.fusion_classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(fusion_input_dim, 384),
            nn.LayerNorm(384),
            nn.GELU(),
            nn.Dropout(dropout * 0.8),
            nn.Linear(384, 192),
            nn.LayerNorm(192),
            nn.GELU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(192, num_classes)
        )

    def forward(self, audio_spec, video, blendshapes, prosody, context_text, training=False):
        device = audio_spec.device

        audio_feat = self.audio_encoder(audio_spec)
        video_feat = self.video_encoder(video)
        deep_combined = torch.cat([audio_feat, video_feat], dim=1)

        deep_projected = self.deep_projection(deep_combined)
        if training:
            deep_projected = self.feature_dropout(deep_projected)

        blend_feat = self.blendshape_encoder(blendshapes)
        pros_feat = self.prosody_encoder(prosody)

        tokens = self.tokenizer(
            context_text,
            padding=True,
            truncation=True,
            max_length=128,
            return_tensors='pt'
        ).to(device)

        llm_outputs = self.llm(**tokens)
        text_cls = llm_outputs.last_hidden_state[:, 0, :]

        all_features = torch.cat([
            deep_projected,
            blend_feat,
            pros_feat,
            text_cls
        ], dim=1)

        attention_weights = self.fusion_attention(all_features)
        all_features = all_features * attention_weights

        output = self.fusion_classifier(all_features)
        return output
