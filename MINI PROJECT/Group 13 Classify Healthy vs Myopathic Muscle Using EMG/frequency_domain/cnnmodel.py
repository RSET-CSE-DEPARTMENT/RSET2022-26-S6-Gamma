import os
import shutil
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms, datasets
from torch.utils.data import DataLoader
from sklearn.metrics import precision_score, confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt
from torchvision.datasets import ImageFolder

# -----------------------------
# 📁 Step 1: Combine All Images
# -----------------------------
combined_dir = r"C:\Users\USER\Desktop\A_final_data\CWT\scalograms_combined"
healthy_src = [
    r"C:\Users\USER\Desktop\A_final_data\CWT\hea_plots",
    r"C:\Users\USER\Desktop\A_final_data\CWT\hea_plots_aug"
]
unhealthy_src = [
    r"C:\Users\USER\Desktop\A_final_data\CWT\myo_plots",
    r"C:\Users\USER\Desktop\A_final_data\CWT\myo_plots_aug"
]

# Create folders
os.makedirs(os.path.join(combined_dir, "healthy"), exist_ok=True)
os.makedirs(os.path.join(combined_dir, "unhealthy"), exist_ok=True)

# Copy images
def copy_images(src_list, dst_dir):
    for src in src_list:
        for file in os.listdir(src):
            if file.endswith(".png"):
                shutil.copy(os.path.join(src, file), dst_dir)

copy_images(healthy_src, os.path.join(combined_dir, "healthy"))
copy_images(unhealthy_src, os.path.join(combined_dir, "unhealthy"))

# -----------------------------
# 🔄 Step 2: Transforms
# -----------------------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.5]*3, [0.5]*3)
])

# -----------------------------
# 📦 Step 3: Dataset & Loader
# -----------------------------
dataset = ImageFolder(root=combined_dir, transform=transform)
train_size = int(0.8 * len(dataset))
val_size = len(dataset) - train_size
train_dataset, val_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])

train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

# -----------------------------
# 🧠 Step 4: CNN Model
# -----------------------------
class EMG_CNN(nn.Module):
    def __init__(self):
        super(EMG_CNN, self).__init__()
        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(16)
        self.pool1 = nn.MaxPool2d(2, 2)

        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(32)
        self.pool2 = nn.MaxPool2d(2, 2)

        self.conv3 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(64)
        self.pool3 = nn.MaxPool2d(2, 2)

        self.dropout = nn.Dropout(0.5)
        self.fc1 = nn.Linear(64 * 28 * 28, 128)
        self.fc2 = nn.Linear(128, 2)

    def forward(self, x):
        x = self.pool1(F.relu(self.bn1(self.conv1(x))))
        x = self.pool2(F.relu(self.bn2(self.conv2(x))))
        x = self.pool3(F.relu(self.bn3(self.conv3(x))))
        x = x.view(x.size(0), -1)
        x = self.dropout(x)
        x = F.relu(self.fc1(x))
        x = self.fc2(x)
        return x

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = EMG_CNN().to(device)

# -----------------------------
# 🏋️‍♂️ Step 5: Training
# -----------------------------
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.0005)
num_epochs = 20

train_losses = []
val_losses = []
train_accuracies = []
val_accuracies = []
val_precisions = []

for epoch in range(num_epochs):
    model.train()
    total_train, correct_train, running_train_loss = 0, 0, 0.0

    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)
        outputs = model(images)
        loss = criterion(outputs, labels)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        running_train_loss += loss.item()
        _, predicted = torch.max(outputs, 1)
        total_train += labels.size(0)
        correct_train += (predicted == labels).sum().item()

    train_acc = 100 * correct_train / total_train
    train_losses.append(running_train_loss)
    train_accuracies.append(train_acc)

    model.eval()
    total_val, correct_val, running_val_loss = 0, 0, 0.0
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)

            running_val_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total_val += labels.size(0)
            correct_val += (predicted == labels).sum().item()
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())

    val_acc = 100 * correct_val / total_val
    precision = precision_score(all_labels, all_preds, average='binary')

    val_losses.append(running_val_loss)
    val_accuracies.append(val_acc)
    val_precisions.append(precision)

    print(f"Epoch [{epoch+1}/{num_epochs}] → Train Loss: {running_train_loss:.4f} | Train Acc: {train_acc:.2f}% | Val Loss: {running_val_loss:.4f} | Val Acc: {val_acc:.2f}% | Precision: {precision:.2f}")

# -----------------------------
# 💾 Step 6: Save Model & Plots
# -----------------------------
save_dir = r"C:\Users\USER\Desktop\A_final_data\MODEL"
os.makedirs(save_dir, exist_ok=True)

# Save model
torch.save(model.state_dict(), os.path.join(save_dir, "emg_cnn_model.pth"))

# Plot training curves
epochs = range(1, num_epochs + 1)
plt.figure(figsize=(12, 5))

plt.subplot(1, 2, 1)
plt.plot(epochs, train_losses, label="Train Loss")
plt.plot(epochs, val_losses, label="Val Loss")
plt.xlabel("Epoch")
plt.ylabel("Loss")
plt.title("Loss Curve")
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(epochs, val_accuracies, label="Val Accuracy")
plt.plot(epochs, val_precisions, label="Val Precision")
plt.xlabel("Epoch")
plt.ylabel("Metric")
plt.title("Validation Accuracy & Precision")
plt.legend()

plt.tight_layout()
plt.savefig(os.path.join(save_dir, "training_curves.png"))
plt.close()

# -----------------------------
# 📉 Confusion Matrix
# -----------------------------
cm = confusion_matrix(all_labels, all_preds)
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["Healthy", "Unhealthy"])
disp.plot(cmap="Blues")
plt.title("Confusion Matrix")
plt.savefig(os.path.join(save_dir, "confusion_matrix.png"))
plt.close()

print(f"\n✅ All results saved to: {save_dir}")
