export default {
    build: {
        sourcemap: true,
        lib: {
            entry: "src/opUserSdk.js",
            name: "unic2OpUserSdk",
            fileName: "index"
        },
        rollupOptions: { }
    }
}