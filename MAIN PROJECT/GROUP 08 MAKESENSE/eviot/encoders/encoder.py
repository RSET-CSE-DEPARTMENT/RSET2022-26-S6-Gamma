import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel


class Encoder:
    def __init__(self, model_name="BAAI/bge-base-en-v1.5", device=None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name).to(self.device)
        self.model.eval()

    @torch.no_grad()
    def encode(self, texts):
        if isinstance(texts, str):
            texts = [texts]

        inputs = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=256,
            return_tensors="pt"
        ).to(self.device)

        outputs = self.model(**inputs)
        emb = outputs.last_hidden_state[:, 0]  # CLS
        emb = F.normalize(emb, dim=-1)
        return emb.cpu()