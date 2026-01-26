
let leaveTimer: NodeJS.Timeout | null = null

export const setIgnoreMouseEvents = (ignore: boolean) => {
    const ipcRenderer = (window as any).ipcRenderer
    if (!ipcRenderer) return

    if (!ignore) {
        // We want to capture mouse (ignore=false)
        if (leaveTimer) {
            clearTimeout(leaveTimer)
            leaveTimer = null
        }
        ipcRenderer.send('set-ignore-mouse-events', false)
    } else {
        // We want to ignore mouse (ignore=true)
        // Debounce to prevent flickering and allow other elements to grab focus
        if (leaveTimer) clearTimeout(leaveTimer)
        leaveTimer = setTimeout(() => {
            ipcRenderer.send('set-ignore-mouse-events', true, { forward: true })
            leaveTimer = null
        }, 100)
    }
}
