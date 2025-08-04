# Siri Integration Setup

You can create a Siri Shortcut to quickly add events to Calvin using voice commands like "Hey Siri, add meeting with John tomorrow at 2pm to Calvin".

## Setup Instructions

### 1. Create the Siri Shortcut

1. Open the **Shortcuts** app on your iPhone/iPad
2. Tap the **+** button to create a new shortcut
3. Add these actions in order:

#### Action 1: Get Text from Input
- Search for "Get Text from Input"
- Add this action
- This will capture what you say after "Hey Siri"

#### Action 2: URL Action
- Search for "URL"
- Add this action
- Set the URL to: `https://your-app-domain.com/create?event={Text from Input}`
- Replace `your-app-domain.com` with your actual domain

#### Action 3: Open URL
- Search for "Open URL"
- Add this action
- Connect it to the URL from the previous action

### 2. Configure the Shortcut

1. Tap the shortcut name at the top to rename it
2. Name it something like "Add Event to Calvin"
3. Tap the shortcut icon to customize it
4. Choose an icon and color
5. Tap "Add to Siri" to record your voice command

### 3. Test the Integration

1. Say "Hey Siri, [your shortcut name]"
2. When prompted, say your event details
3. The app should open and automatically process your event

## Available Routes

- `/` or `/calendar` - Main calendar view
- `/create` - Create new event (with optional `event` parameter for Siri)
- `/edit` - Edit existing event (with `event` parameter for event data)
- `/settings` - Settings page

## Example Voice Commands

- "Hey Siri, add meeting with John tomorrow at 2pm to Calvin"
- "Hey Siri, add dentist appointment on Friday at 10am to Calvin"
- "Hey Siri, add team lunch next Tuesday at noon to Calvin"

## Advanced Setup (Optional)

### Custom URL Scheme
If you want to use a custom URL scheme instead of HTTPS, you can:

1. Register a custom URL scheme in your app (e.g., `calvin://`)
2. Update the URL in the shortcut to: `calvin://create?event={Text from Input}`

### Multiple Parameters
You can pass additional parameters:
```
https://your-app-domain.com/create?event={Text from Input}&priority=high&reminder=15min
```

## Troubleshooting

- **App doesn't open**: Make sure the URL is correct and your app is accessible
- **Event doesn't process**: Check that the `event` parameter is being passed correctly
- **Siri doesn't recognize command**: Try re-recording your voice command in the Shortcuts app

## Security Note

The event text is passed as a URL parameter, so avoid including sensitive information in your voice commands. 