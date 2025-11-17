import jwt from "jsonwebtoken";

const token = `eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ0TGRqWXFPTkQzS1dUc00wUUVKczJncW9Ob0Jha1RoTllVd2tyd0tyclhRIn0.eyJleHAiOjE3NjI4NDczMDgsImlhdCI6MTc2Mjg0NzAwOCwiYXV0aF90aW1lIjoxNzYyODQ1NTk4LCJqdGkiOiJvbnJ0YWM6OTkwZGMwYmUtNWE3MS00ZjViLThiMWYtMWZjNTM5MGRlNDExIiwiaXNzIjoiaHR0cHM6Ly91bmljMmtleWNsb2FrLnN0ZW5tc3Mub3JnL3JlYWxtcy91bmljMiIsImF1ZCI6WyJ1bmljMi1kZXZpY2VtYW5hZ2VtZW50LWJhY2tlbmQiLCJhY2NvdW50Il0sInN1YiI6IjEwODM5ZDg1LWQ4MjktNDc1MC1iMjcwLWM0MDczNDJhZDA2YiIsInR5cCI6IkJlYXJlciIsImF6cCI6InVuaWMyYXBwLWZyb250ZW5kIiwic2lkIjoiMjY4ZDAxNTEtODM1MC00MWFjLTg0ZmQtZGQ4NjliMGUwOTY4IiwiYWNyIjoiMCIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwczovL3VuaWMyLnN0ZW5tc3Mub3JnIiwiaHR0cDovL2xvY2FsaG9zdDo1MTczIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJkZWZhdWx0LXJvbGVzLXVuaWMyIiwib2ZmbGluZV9hY2Nlc3MiLCJkZXZpY2Vwcm92aXNpb24iLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsIm5hbWUiOiJ5aWh1aSBMdSIsInByZWZlcnJlZF91c2VybmFtZSI6InByb3Zpc2lvbmFkbWluIiwiZ2l2ZW5fbmFtZSI6InlpaHVpIiwiZmFtaWx5X25hbWUiOiJMdSIsImVtYWlsIjoieWlodWkubHVAc3RlbmdnLmNvbSJ9.a4lzRZIumQbf-S1SvOIDS3bEdb4UtYFM-VMQ8nMHS-qwKulNK2uXslDiusjxx730vc_F3TBMCEhprwgmaSSCltHjHb2R3c0_dcX3Qqr3biZi70dD2tU5YynW-iyDtddR5X_FNkF49P57cjqpeQy4S6ndbNxa-GNwjQjQzYj9Wg_JvkmbZ0aG5IR--8OGMOhHV2nT_jNuZy7JavxwYuNjqQPY-JEnYFJdRMjneAN4eA-ng7VXwn3990Oax4VLofhhmokTaYpXJcxA--Anp7GtyCwAdSDcCpqd55GQB_qZJhXSraTZHyytItbCxdQ-8AXUCdoyX1FuSIgG9YawSDZc2w`;

const KEYCLOAK_URL = "https://unic2keycloak.stenmss.org"
const REALM = "unic2"
import crypto from "crypto"

async function getPublicKey() {
  const res = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`)
  const data = await res.json()
  const key = data.keys.find(k => k.use === "sig" && k.kty === "RSA")

  const jwk = { kty: "RSA", n: key.n, e: key.e }
  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" })
  const pem = publicKey.export({ type: "pkcs1", format: "pem" }) // ✅ exact "RSA PUBLIC KEY"

  return pem
}

const main = async () => {
  try {
    const pubPem = await getPublicKey()
    const decoded = jwt.verify(token, pubPem, { algorithms: ["RS256"] })
    console.log("✅ Verified!")
    console.log("aud:", decoded.aud)
    console.log("azp:", decoded.azp)
  } catch (err) {
    console.error("❌ Verification failed:", err.message)
  }
}

main()

/*
const pubPem = `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAnOuNsJbQ+JtpVJdLbkVy70w1VlE+hpbiOaSl23VQqqzLVusXXB7zHv3oYOQNeftiWUGd0eI+N4VX96+tN6ys7FPvT11Pv7eO/gwXlnBCnDb3KohTQFkPerbb++wi9r7PC276mLpSOJO+AN2yXTJvYMYj8qIJD6vfa4rsPMUnikJvIHyEk+OEXXQXjI+PkLYRJv2v4FCRt+119KgzKOg5w0aiBG0m4PyuasG/uUI17Zv1hSVqOeDkJVNZZRG1KiJx1p64lhfeGGO72G0LHDMhd7+M+bKzCh3ZGtt1qt7rUGpTEBkH3t/LRKz3EDgG/+OtH6k304cVGyzHGG946h6paQIDAQAB
-----END RSA PUBLIC KEY-----`;
*/