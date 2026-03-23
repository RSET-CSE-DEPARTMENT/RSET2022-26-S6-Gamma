import requests

# Define the API URL
api_url = "http://192.168.29.16:5000/download"

# Define the data payload
data = {"youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}

# Send a POST request
response = requests.post(api_url, json=data)

# Print the response
print("Status Code:", response.status_code)
print("Response:", response.json())
