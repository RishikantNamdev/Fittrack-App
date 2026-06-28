import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import urllib.request

def run_validation():
    image_path = os.path.join("assets", "human-pose.jpg")
    task_path = "pose_landmarker_full.task"
    task_url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task"
    output_path = "mediapipe_result.png"

    if not os.path.exists(image_path):
        print(f"Error: Target image not found at {image_path}")
        return

    # Download official task file if missing
    if not os.path.exists(task_path):
        print(f"Downloading official MediaPipe Pose Landmarker task from {task_url}...")
        try:
            urllib.request.urlretrieve(task_url, task_path)
            print("Download complete!")
        except Exception as e:
            print(f"Error downloading task file: {e}")
            return

    # Load image
    image = cv2.imread(image_path)
    height, width, _ = image.shape
    print(f"Image Dimensions: {width}x{height} (Width x Height)")

    # Run PoseLandmarker using Tasks API
    options = vision.PoseLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=task_path),
        output_segmentation_masks=False
    )
    
    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        # Load input image in MediaPipe format
        mp_image = mp.Image.create_from_file(image_path)
        
        # Run detection
        results = landmarker.detect(mp_image)
        
        if not results.pose_landmarks:
            print("Error: No pose detected in image.")
            return
            
        print("Pose detection successful!")
        
        # Target landmarks to print
        target_indices = {
            0: "Nose",
            11: "Left Shoulder",
            12: "Right Shoulder",
            23: "Left Hip",
            24: "Right Hip",
            25: "Left Knee",
            26: "Right Knee"
        }
        
        landmarks = results.pose_landmarks[0]
        
        print("\nOfficial MediaPipe Landmark Coordinates (Normalized [0.0, 1.0]):")
        for idx, name in target_indices.items():
            lm = landmarks[idx]
            print(f"  [{idx:2d}] {name:15s}: x={lm.x:.5f}, y={lm.y:.5f}, z={lm.z:.5f}, visibility={lm.visibility:.5f}, presence={lm.presence:.5f}")
            
        print("\nOfficial MediaPipe Landmark Coordinates (Pixel-Space [0, width] / [0, height]):")
        for idx, name in target_indices.items():
            lm = landmarks[idx]
            px_x = lm.x * width
            px_y = lm.y * height
            print(f"  [{idx:2d}] {name:15s}: x={px_x:.2f}px, y={px_y:.2f}px")

        # Let's draw landmarks on the image for visualization
        # In mediapipe 0.10.x, we can draw them using opencv manually or use drawing_utils
        # Since solutions might be missing, let's draw them using opencv manually
        annotated_image = image.copy()
        
        # Define connection lines between landmarks
        connections = [
            (11, 12), # shoulders
            (11, 23), (12, 24), # shoulder to hip
            (23, 24), # hips
            (11, 13), (13, 15), # left arm
            (12, 14), (14, 16), # right arm
            (23, 25), (25, 27), # left leg
            (24, 26), (26, 28)  # right leg
        ]
        
        # Draw connections
        for idx1, idx2 in connections:
            if idx1 < len(landmarks) and idx2 < len(landmarks):
                p1 = landmarks[idx1]
                p2 = landmarks[idx2]
                pt1 = (int(p1.x * width), int(p1.y * height))
                pt2 = (int(p2.x * width), int(p2.y * height))
                cv2.line(annotated_image, pt1, pt2, (230, 70, 79), 2) # BGR Red-ish
                
        # Draw joints
        for idx in range(33):
            if idx < len(landmarks):
                p = landmarks[idx]
                pt = (int(p.x * width), int(p.y * height))
                cv2.circle(annotated_image, pt, 4, (16, 185, 129), -1) # BGR Green
                cv2.circle(annotated_image, pt, 4, (255, 255, 255), 1) # White border
                
        # Save visualization
        cv2.imwrite(output_path, annotated_image)
        print(f"\nVisualization saved successfully to: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    run_validation()
