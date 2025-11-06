import cv2
from deepface import DeepFace

# Initialize webcam
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Analyze all faces in the frame
    try:
        # Set enforce_detection=False to avoid errors if no face is found
        results = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)

        # If only one face, wrap single dict in a list for consistency
        if isinstance(results, dict):
            results = [results]

        for face in results:
            region = face["region"]
            emotion = face["dominant_emotion"]

            # Draw rectangle around face
            x, y, w, h = region['x'], region['y'], region['w'], region['h']
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

            # Draw emotion label above rectangle
            cv2.putText(
                frame,
                emotion,
                (x, y - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                (255, 0, 0),
                2,
                cv2.LINE_AA
            )
    except Exception as e:
        # If DeepFace fails, you can print(e) for debugging or just pass
        pass

    cv2.imshow("Webcam Face & Emotion Detection", frame)

    # Exit on pressing 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()