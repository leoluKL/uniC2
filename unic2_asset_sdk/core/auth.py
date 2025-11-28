import requests

def get_access_token(auth_url, realm, asset_id, asset_secret):
    token_url = f"{auth_url}/realms/{realm}/protocol/openid-connect/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": asset_id,
        "client_secret": asset_secret
    }

    response = requests.post(token_url, data=data, timeout=10)
    if response.status_code != 200:
        raise Exception("Auth failed: " + response.text)

    body = response.json()
    return body["access_token"]