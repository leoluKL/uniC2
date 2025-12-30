# unic2_ws_backend
Start: nodemon server.js

# unic2_opUser_sdk
Start(it is only a sdk):
npm link
npm run build

# unic2_opUser_app
Start: 
npm link unic2-opuser-sdk
npm run dev

# unic2_opUser_admin
Start: 
npm run dev


# AssetSDK
Start (There is test asset python code in it):
source .venv/bin/activate
python3 assetsdktest_1.py &
python3 assetsdktest_2.py &

jobs
fg %1,2....

To Stop:
jobs -p | xargs kill