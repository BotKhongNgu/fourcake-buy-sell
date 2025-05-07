# Changelog

### Sửa lỗi

- Đã sửa lỗi bot ngừng hoạt động khi ứng dụng bị thu nhỏ (minimize) do cơ chế tiết kiệm điện của hệ điều hành

### Thay đổi kỹ thuật

- Thêm cơ chế ngăn chặn ứng dụng bị tạm dừng khi chạy nền
- Thêm cơ chế keep-alive để duy trì hoạt động của ứng dụng

### Chi tiết kỹ thuật

#### 1. Ngăn chặn việc throttling khi ứng dụng chạy nền

```typescript
// src/main/windows.ts
export function createWindow() {
  const mainWindow = new BrowserWindow({
    // ...
    webPreferences: {
      // ...
      backgroundThrottling: false, // Prevent background throttling
    },
  })

  // Add event handlers for window blur/focus
  mainWindow.on("blur", () => {
    // Prevent app nap/suspension on macOS
    if (process.platform === "darwin") {
      mainWindow.setBackgroundThrottling(false)
    }
  })

  // ...
}
```

#### 2. Thêm Power Save Blocker

```typescript
// src/main/index.ts
import { app, powerSaveBlocker } from "electron"

// Variable to store the power save blocker ID
let powerSaveBlockerId: number = -1

// Add IPC handlers for power management
ipcMain.handle("start-power-save-blocker", () => {
  if (powerSaveBlockerId === -1) {
    // Prevent app suspension and display sleep
    powerSaveBlockerId = powerSaveBlocker.start("prevent-app-suspension")
  }
  return { success: true, id: powerSaveBlockerId }
})

ipcMain.handle("stop-power-save-blocker", () => {
  if (powerSaveBlockerId !== -1) {
    powerSaveBlocker.stop(powerSaveBlockerId)
    powerSaveBlockerId = -1
  }
  return { success: true }
})

app.on("window-all-closed", () => {
  // Stop power save blocker when all windows are closed
  if (powerSaveBlockerId !== -1) {
    powerSaveBlocker.stop(powerSaveBlockerId)
    powerSaveBlockerId = -1
  }
  // ...
})
```

#### 3. Thêm cơ chế Keep-Alive

```typescript
// src/main/index.ts
app.whenReady().then(() => {
  const mainWindow = createWindow()
  // ...

  // Create a keep-alive interval to prevent the app from being suspended
  const keepAliveInterval = setInterval(() => {
    if (!mainWindow.isDestroyed()) {
      console.log("Keep-alive ping")
    } else {
      clearInterval(keepAliveInterval)
    }
  }, 30000) // 30 seconds

  // ...
})
```

#### 4. Cập nhật Preload API

```typescript
// src/preload/index.ts
const api = {
  // ...

  // Power management APIs
  startPowerSaveBlocker: () => ipcRenderer.invoke("start-power-save-blocker"),
  stopPowerSaveBlocker: () => ipcRenderer.invoke("stop-power-save-blocker"),

  // ...
}
```

#### 5. Cập nhật TypeScript Definitions

```typescript
// src/renderer/src/types/window.d.ts
interface Window {
  api: {
    // ...

    // Power management APIs
    startPowerSaveBlocker: () => Promise<{ success: boolean; id: number }>;
    stopPowerSaveBlocker: () => Promise<{ success: boolean }>;

    // ...
  }
}
```

#### 6. Kích hoạt Power Save Blocker khi bot bắt đầu chạy

```typescript
// src/renderer/src/components/BotControl.tsx
const onStart = async () => {
  // ...

  // Start power save blocker to prevent app suspension
  try {
    const result = await window.api.startPowerSaveBlocker();
    console.log("Power save blocker started:", result);

    await db.logs.add({
      createdAt: new Date(),
      updatedAt: new Date(),
      message: `Đã kích hoạt chế độ ngăn chặn tạm dừng ứng dụng`,
    });
  } catch (error) {
    console.error("Failed to start power save blocker:", error);
  }

  // ...
}
```

#### 7. Tắt Power Save Blocker khi bot dừng

```typescript
// src/renderer/src/components/BotControl.tsx
const onStop = async () => {
  // ...

  // Stop power save blocker
  try {
    const result = await window.api.stopPowerSaveBlocker();
    console.log("Power save blocker stopped:", result);

    await db.logs.add({
      createdAt: new Date(),
      updatedAt: new Date(),
      message: `Đã tắt chế độ ngăn chặn tạm dừng ứng dụng`,
    });
  } catch (error) {
    console.error("Failed to stop power save blocker:", error);
  }

  // ...
}
```
