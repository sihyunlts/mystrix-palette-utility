export const en = {
  translation: {
    tabs: {
      palette: "Palette",
      backup: "Backup"
    },
    footer: {
      by: "for matrixos, by sihyunlights.",
      status: "website under construction."
    },
    sections: {
      device: "Select Device",
      preview: "Lightshow Preview",
      presets: "Palette Presets",
      backupRestore: "Backup & Restore"
    },
    buttons: {
      refresh: "Refresh",
      disconnect: "Disconnect",
      selectFile: "Select MIDI File",
      upload: "Upload",
      delete: "Delete",
      cancel: "Cancel",
      import: "Import",
      export: "Export",
      info: "Info",
      reset: "Reset",
      okay: "Okay",
      uhhOkay: "Uhh okay",
      connect: "Connect",
      restoreSelected: "Restore Selected",
      backupToFile: "Backup to File",
      restoreFromFile: "Restore from File"
    },
    labels: {
      saturationAndContrast: "Saturation & Contrast",
      slot: "Slot",
      selectedPad: "Selected Pad",
      rgbValue: "RGB Value",
      saturation: "Saturation",
      contrast: "Contrast",
      status: "Status",
      appLauncher: "App Launcher",
      systemSettings: "System Settings",
      deviceSettings: "Device Settings"
    },
    messages: {
      previewDesc: "Upload a MIDI file to preview the lightshow effect on the grid.",
      noDevices: "No devices detected.",
      initializing: "Initializing MIDI...",
      webMidiError: "Web MIDI API not supported or access denied.",
      webHidError: "WebHID API not supported. Please use a supported browser.",
      deviceConnected: "Device connected",
      deviceDisconnected: "Device disconnected",
      uploading: "Uploading...",
      uploadingProgress: "Uploading ({{progress}}%)...",
      uploadFailed: "Upload Failed",
      deleteFailed: "Deletion Failed",
      loadFailed: "Load Failed",
      loadFailedError: "Load Failed: {{error}}",
      presetLoadFailed: "Preset Load Failed",
      featureNotSupported: "This feature won't work.",
      featureNotSupportedDesc: "The official MatrixOS does not support this feature. Furthermore, since you can simply overwrite the palette, most users don't even need this functionality. However, I added it because I found unused palettes cluttering the UI unsightly...",
      disconnected: "Disconnected",
      connectedTo: "Connected to {{name}}",
      openBackupApp: "Error: Please open 'Backup' App on device",
      preparingBackup: "Preparing backup...",
      readingDevice: "Reading device ({{progress}}%)...",
      downloading: "Downloading ({{progress}}%)...",
      backupComplete: "Backup Complete",
      backupFailed: "Backup Failed: {{error}}",
      restoreComplete: "Restore Complete!",
      restoreFailed: "Restore Failed: {{error}}",
      versionMismatch: "Restore Failed: Version mismatch (File V{{fileVersion}} vs Device V{{deviceVersion}})",
      backupNote: "Note: Ensure the 'Backup' app is running on the device.",
      selectDataToRestore: "Select Data to Restore",
      descLauncher: "Folders, App Order",
      descSystem: "Global configs (Brightness)",
      descDevice: "Device-specific configs (Touchbar, Bluetooth)",
      connectionFailed: "Connection failed",
      disconnectionFailed: "Disconnection failed",
      connecting: "Connecting...",
      loadedBackup: "Loaded backup file. Select items to restore."
    },
    links: {
      matrixOS: "MatrixOS",
      wiki: "MatrixOS wiki",
      editor: "MatrixOS Control Map Editor",
      simulator: "MatrixOS Simulator"
    },
    presets: {
      descriptions: {
        novation_rg: "The Red and Green only palette used by early Novation Launchpads.",
        novation_rgb: "The modern full RGB palette applied by default to all RGB Launchpads after the Launchpad MK2.",
        mat1jaczyyy: "A custom-tuned RGB palette by mat1jaczyyy.",
        sihyunlights: "A palette nearly identical to the Novation RGB palette, but with the 71st color adjusted to be darker."
      }
    },
    dropdown: {
      links: "Links",
      language: "Language"
    }
  }
};
