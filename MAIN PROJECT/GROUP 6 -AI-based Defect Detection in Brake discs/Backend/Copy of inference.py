import torch
import torch.nn.functional as F
import cv2
import numpy as np
from PIL import Image
from torchvision import transforms

def predict_defect(image_path, model, threshold=0.40):
    """
    Runs inference with Safety Logic.
    """
    # 1. Preprocess
    img = Image.open(image_path).convert('RGB')
    
    # Define the standard transformation pipeline
    preprocess = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Apply transform and add batch dimension
    img_tensor = preprocess(img).unsqueeze(0)
    
    device = next(model.parameters()).device
    img_tensor = img_tensor.to(device)

    # 2. Inference
    model.eval()
    with torch.no_grad():
        logits = model(img_tensor)
        probs = F.softmax(logits, dim=1)
        
    # 3. Get Probabilities
    # Class 0 = Accept, 1 = Casting Fault, 2 = Surface Imperfection
    prob_accept = probs[0][0].item()
    prob_fault = probs[0][1].item()
    prob_imperfection = probs[0][2].item()
    
    pred_idx = torch.argmax(probs, dim=1).item()
    confidence = probs[0][pred_idx].item()
    
    # 4. SAFETY LOGIC
    # If predicted "Accept" BUT risk of Fault is high -> Override
    if pred_idx == 0 and prob_fault > threshold:
        return f"Safety Trigger: Potential Casting Fault Detected! ({prob_fault*100:.1f}%)", prob_fault
        
    labels = ["Accept", "Casting Fault", "Surface Imperfection"]
    return labels[pred_idx], confidence


def generate_heatmap(image_path, model, target_class=1):
    """
    Generates a Grad-CAM heatmap.
    """
    # 1. Load Image and Preprocess (Same as above)
    img_pil = Image.open(image_path).convert('RGB')
    img_pil = img_pil.resize((224, 224))
    img = np.array(img_pil)
    
    preprocess = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    img_tensor = preprocess(img_pil).unsqueeze(0)
    
    device = next(model.parameters()).device
    img_tensor = img_tensor.to(device).requires_grad_(True)
    
    # 2. Hook into the last Convolutional Layer
    target_layer = model.mobilenet.features[-1]
    
    gradients = []
    activations = []
    
    def backward_hook(module, grad_input, grad_output):
        gradients.append(grad_output[0])
        
    def forward_hook(module, input, output):
        activations.append(output)
        
    handle_b = target_layer.register_full_backward_hook(backward_hook)
    handle_f = target_layer.register_forward_hook(forward_hook)
    
    # 3. Forward Pass
    model.zero_grad()
    output = model(img_tensor)
    
    # 4. Backward Pass
    score = output[0][target_class]
    score.backward()
    
    # 5. Compute Grad-CAM
    grads = gradients[0].cpu().data.numpy()[0]
    fmaps = activations[0].cpu().data.numpy()[0]
    
    # Global Average Pooling of Gradients
    weights = np.mean(grads, axis=(1, 2))
    cam = np.zeros(fmaps.shape[1:], dtype=np.float32)
    for i, w in enumerate(weights):
        cam += w * fmaps[i]
        
    cam = np.maximum(cam, 0)
    cam = cv2.resize(cam, (224, 224))
    cam = cam - np.min(cam)
    cam = cam / (np.max(cam) + 1e-8)
    
    # 6. Create Heatmap Image
    heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    
    result = cv2.addWeighted(img, 0.6, heatmap, 0.4, 0)
    
    handle_b.remove()
    handle_f.remove()
    
    return result
