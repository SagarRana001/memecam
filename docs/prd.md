# Product Requirements Document (PRD): MemeGen AI

## 1. Product Vision
To become the fastest, most intuitive tool for generating viral memes from personal photos using state-of-the-art AI.

## 2. User Stories
- **As a casual user**, I want to generate a few memes daily for free without logging in immediately.
- **As a power user**, I want to remove limits and manage my subscription easily via Google Play.
- **As a social media user**, I want to share my generated memes instantly to Instagram or WhatsApp.

## 3. Functional Requirements (Logic Flow)
The application must strictly follow the logic defined in the **Action Diagram**:

### 3.1 Authentication & Profile
- **Google Login**: Primary authentication method.
- **Account Management**: 
    - **View Profile**: Display basic Google profile info.
    - **Logout**: Securely sign out and clear local session state.
    - **Delete Account**: Permanent deletion of user record and revocable access from Google.
- **Subscription States**:
    - **Guest**: 3 free memes/day (Local storage/IP tracking).
    - **Subscriber**: Unlimited memes, no watermark.

### 3.2 Meme Generation Flow
1. **Trigger**: User clicks "Pic" on Landing.
2. **Limit Check**: Verify if user has generated `< 3` memes today.
3. **Happy Path (Under Limit)**:
    - **Step 1**: Crop image to square format.
    - **Step 2**: Compress to `256 x 256` for faster upload/processing.
    - **Step 3**: Call **Gemini AI** to generate a contextually relevant meme caption based on the image content.
    - **Step 4**: Overlay generated text and brand watermark on the image.
    - **Step 5**: Transition to **Result Screen**.
4. **Restricted Path (Over Limit)**:
    - Force transition to **Subscription Screen**.
    - If not logged in -> Prompt **Google Login**.
    - If logged in -> Initiate **Play Billing** flow.
5. **Post-Payment Logic**:
    - On successful transaction verification, redirect to **Landing Screen**.
    - Display "Premium Activated" success toast.

### 3.3 Post-Generation Actions
- **Share**: Open the native system app drawer to share the image.
- **Close**: Return to the Landing Screen.

## 4. Technical Requirements
- **Frontend**: Mobile-optimized web or native app (TBD based on tech stack).
- **Backend/AI**:
    - Integration with Gemini Pro Vision API.
    - Image processing library (e.g., Sharp or Canvas) for cropping/compressing and text overlay.
- **Monetization**: Google Play Billing Library integration.
- **Analytics**: Firebase or similar for tracking DAU and conversion events.

## 5. Error Handling & Edge Cases
- **AI Timeout**: If Gemini fails to respond within 10s, show a "Model Busy" state with a "Retry" button.
- **Image Processing Errors**: If crop/compress fails (e.g., corrupt file), show "Unsupported file format".
- **Payment Cancellations**: Stay on the Subscription screen with no error message (allow user to try again).
- **Network Errors**: Display a generic "Check connection" banner.

## 6. UI/UX Requirements
- **Landing Screen**: Minimalist design with a focus on the "Select Pic" button and a small "Subscription" icon/link.
- **Subscription Screen**: Clear differentiation between logged-in and guest states. Simple "Subscribe" button.
- **Result Screen**: High-quality preview of the meme with prominent "Share" and "Home" (Close) buttons.

## 7. Non-Functional Requirements
- **Latentcy**: Total generation time (upload to result) should be `< 10 seconds`.
- **Security**: Secure handling of sessions via Google OAuth.
- **Scalability**: Capable of handling peaks in AI requests through queue management if needed.

## 8. Future Considerations
- Custom text editing for memes.
- Historical gallery of generated memes.
- Batch generation for subscribers.
