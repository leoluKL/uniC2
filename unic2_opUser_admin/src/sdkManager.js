import unic2OpUserSdk from "unic2-opuser-sdk";
import { appConfig } from './appConfig.js'

const sdkManager = new unic2OpUserSdk({
    authUrl: appConfig.keycloakUrl,
    clientId: appConfig.appKeycloakClientId,
    realm: appConfig.realm,
    wsUrl: appConfig.wsUrl
});
export default sdkManager;