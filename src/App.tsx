import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Color, Palette } from './types';
import { MatrixOSMIDI } from './utils/midi';
import { MIDIConnection } from './components/palette/MIDIConnection';
import { PaletteGrid } from './components/palette/MystrixPreview';
import { DropdownButton } from './components/ui/DropdownButton';
import { Button } from './components/ui/Button';
import { ModalProvider, useModal } from './components/ui/Modal';
import { GlobalAdjustmentBox } from './components/palette/GlobalAdjustmentBox';
import { HueAdjustmentBox } from './components/palette/HueAdjustmentBox';
import { SectionHeader } from './components/ui/SectionHeader';
import { loadPaletteFromFile, savePaletteToFile, parsePaletteFile } from './utils/paletteFile';
import { applyGlobalSettings } from './utils/colorUtils';
import { FACTORY_PALETTE_COLORS, FACTORY_PALETTE_NAME } from './utils/factoryPalette';
import { useLightshow } from './hooks/useLightshow';
import { useLivePalettePreview } from './hooks/useLivePalettePreview';
import { BackupRestore } from './components/backup/BackupRestore';
import { HIDConnection as HIDManager } from './utils/hid';
import { HIDConnection } from './components/backup/HIDConnection';
import { toMystrixPreviewIndex, toMystrixSysexTarget } from './utils/mystrixLayout';
import styles from './App.module.css';

const SLIDER_RESET_TRANSITION_MS = 120;

// Dynamic Preset Loader
// Vite equivalent of require.context
const presets = import.meta.glob('./presets/*', { query: '?url', eager: true });

const INITIAL_PRESETS = Object.entries(presets).map(([path, module]: [string, any]) => {
  const filename = path.split('/').pop() || '';
  if (filename.endsWith('.ts') || filename.endsWith('.js')) return null;
  
  const id = filename.replace(/\.[^/.]+$/, "").toLowerCase();
  const name = filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
  return {
    id: path,
    cleanId: id,
    name: name,
    url: module.default || module
  };
}).filter((p): p is any => p !== null);

const AppContent: React.FC = () => {
  const { t, i18n } = useTranslation();

  const { showModal } = useModal();
  const [matrixOS, setMatrixOS] = useState<MatrixOSMIDI | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<MIDIOutput | null>(null);
  
  // Use URL hash for routing (default to 'palette' if empty or invalid)
  const [currentPage, setCurrentPage] = useState<'palette' | 'backup'>(() => {
    const hash = window.location.hash.replace('#', '');
    return (hash === 'backup') ? 'backup' : 'palette';
  });

  // Sync state to URL hash
  useEffect(() => {
    window.location.hash = currentPage;
  }, [currentPage]);

  // Sync URL hash to state (for back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      setCurrentPage((hash === 'backup') ? 'backup' : 'palette');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // Single Palette Workflow
  const [palette, setPalette] = useState<Palette>(() => ({
    id: 1,
    name: FACTORY_PALETTE_NAME,
    colors: [...FACTORY_PALETTE_COLORS],
    available: true
  }));
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | undefined>(undefined);
  
  // HID Connection State (for Backup)
  const hidInstance = useMemo(() => new HIDManager(), []);
  const [hidDevice, setHidDevice] = useState<any | null>(null);
  const hidConnected = !!hidDevice;

  useEffect(() => {
    hidInstance.onDisconnect(() => {
      setHidDevice(null);
    });
  }, [hidInstance]);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Preview Loop Feature
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);

  // Global Adjustment State (Non-destructive)
  const [globalSaturation, setGlobalSaturation] = useState(0);
  const [globalContrast, setGlobalContrast] = useState(0);
  const [globalHueShift, setGlobalHueShift] = useState(0);
  const [previewTransitionsEnabled, setPreviewTransitionsEnabled] = useState(false);
  const [sliderResetAnimating, setSliderResetAnimating] = useState(false);
  const sliderResetTimeoutRef = useRef<number | null>(null);

  // Computed Palette with Global Adjustments
  const effectivePalette = useMemo(() => {
    return {
        ...palette,
        colors: applyGlobalSettings(palette.colors, globalSaturation, globalContrast, globalHueShift)
    };
  }, [palette, globalSaturation, globalContrast, globalHueShift]);

  useEffect(() => {
    return () => {
      if (sliderResetTimeoutRef.current !== null) {
        window.clearTimeout(sliderResetTimeoutRef.current);
      }
    };
  }, []);

  const animateSliderReset = useCallback(() => {
    if (sliderResetTimeoutRef.current !== null) {
      window.clearTimeout(sliderResetTimeoutRef.current);
    }

    setSliderResetAnimating(true);
    sliderResetTimeoutRef.current = window.setTimeout(() => {
      setSliderResetAnimating(false);
      sliderResetTimeoutRef.current = null;
    }, SLIDER_RESET_TRANSITION_MS);
  }, []);

  const { 
    isLightshowActive, 
    lightshowColors, 
    playLightshow 
  } = useLightshow(matrixOS, effectivePalette, toMystrixPreviewIndex, toMystrixSysexTarget);

  const {
    previewColor: previewPaletteColor,
    setPreviewWindowForIndex,
  } = useLivePalettePreview({
    matrixOS,
    colors: effectivePalette.colors,
    currentPage,
    isLightshowActive,
    animateTransitions: previewTransitionsEnabled,
  });


  const connectionEpochRef = useRef<number>(0);

  const handleDeviceConnected = useCallback(async (device: MIDIOutput) => {
    const epoch = ++connectionEpochRef.current;
    
    // Stabilization delay (allows OS/Browser MIDI enumeration to settle)
    await new Promise(r => setTimeout(r, 400));
    
    // Check if this connection attempt is still the most recent one
    if (epoch !== connectionEpochRef.current) return;

    const connectedMatrixOS = new MatrixOSMIDI(device);
    setMatrixOS(connectedMatrixOS);
    setSelectedDevice(device); // Sync the selection state
    playLightshow('/connected.mid', connectedMatrixOS);
  }, [playLightshow]);

  const handleDeviceDisconnected = useCallback(() => {
    setMatrixOS(prev => {
      try {
        prev?.clearPreview(false);
      } catch (_) {
        // Ignore errors when clearing preview on disconnect
      }
      return null;
    });
    setSelectedDevice(null);
  }, []);

  const handleDeviceSelect = useCallback((device: MIDIOutput | null) => {
    setSelectedDevice(device);
    setMatrixOS(prev => {
      if (!device) {
        try {
          prev?.clearPreview(false);
        } catch (_) {
          // Ignore errors when clearing preview on disconnect
        }
        return null;
      }

      return new MatrixOSMIDI(device);
    });
  }, []);

  const handleColorChange = useCallback((index: number, color: Color) => {
    setPreviewTransitionsEnabled(false);
    const previewColor = applyGlobalSettings(
      [color],
      globalSaturation,
      globalContrast,
      globalHueShift
    )[0];
    previewPaletteColor(index, previewColor);
    setPalette(prev => ({
      ...prev,
      colors: prev.colors.map((c, i) => i === index ? color : c)
    }));
  }, [globalContrast, globalHueShift, globalSaturation, previewPaletteColor]);

  const handleSaturationChange = useCallback((value: number) => {
    setPreviewTransitionsEnabled(false);
    setGlobalSaturation(value);
  }, []);

  const handleContrastChange = useCallback((value: number) => {
    setPreviewTransitionsEnabled(false);
    setGlobalContrast(value);
  }, []);

  const handleHueShiftChange = useCallback((value: number) => {
    setPreviewTransitionsEnabled(false);
    setGlobalHueShift(value);
  }, []);

  const handleAdjustmentReset = useCallback(() => {
    setPreviewTransitionsEnabled(true);
    animateSliderReset();
    setGlobalSaturation(0);
    setGlobalContrast(0);
  }, [animateSliderReset]);

  const handleHueReset = useCallback(() => {
    setPreviewTransitionsEnabled(true);
    animateSliderReset();
    setGlobalHueShift(0);
  }, [animateSliderReset]);

  const handlePadSelect = useCallback((index: number) => {
    setPreviewTransitionsEnabled(false);
    setPreviewWindowForIndex(index);
    setSelectedColorIndex(prev => prev === index ? undefined : index);
  }, [setPreviewWindowForIndex]);

  const handlePadDismiss = useCallback(() => {
    setSelectedColorIndex(undefined);
  }, []);

  const selectedPadColor = (
    selectedColorIndex !== undefined ? palette.colors[selectedColorIndex] : null
  ) || { r: 0, g: 0, b: 0 };

  const handleUpload = async (slotId: number) => {
    if (!matrixOS) return;

    setIsUploading(true);
    try {
      // Hardware expects 0-based index (0=Slot1), but UI provides 1-based.
      await matrixOS.uploadPalette(slotId - 1, effectivePalette.colors);
      playLightshow('/done.mid');
    } catch (error) {
      showModal({
        title: t('messages.uploadFailed'),
        message: String(error),
        type: 'alert',
        isDanger: true
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (slotId: number) => {
    if (!matrixOS) return;

    const confirmed = await showModal({
      title: t('messages.featureNotSupported'),
      message: t('messages.featureNotSupportedDesc'),
      type: 'confirm',
      confirmLabel: t('buttons.uhhOkay'),
      isDanger: true
    });

    if (!confirmed) return;

    try {
      // Hardware expects 0-based index
      await matrixOS.deletePalette(slotId - 1);
      playLightshow('/del_done.mid');
    } catch (error) {
      showModal({
        title: t('messages.deleteFailed'),
        message: String(error),
        type: 'alert',
        isDanger: true
      });
    }
  };

  const handleLoadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const colors = await loadPaletteFromFile(file);
      setPreviewTransitionsEnabled(true);
      setPalette(prev => ({ ...prev, colors }));
      setGlobalSaturation(0);
      setGlobalContrast(0);
      setGlobalHueShift(0);
    } catch (error) {
      showModal({
        title: t('messages.loadFailed'),
        message: 'Failed to load palette: ' + error,
        type: 'alert',
        isDanger: true
      });
    }
  };

  const handleSaveFile = () => {
    savePaletteToFile(effectivePalette);
  };

  const handleApplyPreset = async (url: string, name: string) => {
    try {
        const response = await fetch(url);
        const data = await response.text();
        const colors = parsePaletteFile(data);
        setPreviewTransitionsEnabled(true);
        setPalette({
            id: Date.now(),
            name: name,
            colors: colors,
            available: true
        });
        setGlobalSaturation(0);
        setGlobalContrast(0);
        setGlobalHueShift(0);
        setSelectedColorIndex(undefined);
    } catch (error) {
        showModal({
            title: t('messages.presetLoadFailed'),
            message: 'Failed to fetch preset data: ' + error,
            type: 'alert',
            isDanger: true
        });
    }
  };

  const slotOptions = [
    { label: `${t('labels.slot')} 1`, value: 1 },
    { label: `${t('labels.slot')} 2`, value: 2 },
    { label: `${t('labels.slot')} 3`, value: 3 },
    { label: `${t('labels.slot')} 4`, value: 4 },
  ];

  return (
    <div className={styles.root}>
        <header className={styles.header}>
          <div className={styles.logoContainer}>
            <img src="/favicon.ico" alt="Mystrix Palette Utility" className={styles.logo} />
            <h1>
              <DropdownButton
                  label={currentPage === 'palette' ? (t('tabs.palette') || "Palette") : (t('tabs.backup') || "Backup")}
                  variant="ghost"
                  options={[
                    { label: (t('tabs.palette') || "Palette"), value: 'palette' as any, type: 'item' },
                    { label: (t('tabs.backup') || "Backup"), value: 'backup' as any, type: 'item' }
                  ]}
                  onSelect={(val) => setCurrentPage(val as 'palette' | 'backup')}
                  className={styles.pageTitleDropdown}
                  dropdownPosition="bottom"
              />
            </h1>
          </div>
          
          <div className={styles.headerActions}>
            <DropdownButton
              label={t('dropdown.language')}
              variant="ghost"
              options={[
                { label: 'English', value: 0, type: 'item' },
                { label: '한국어', value: 1, type: 'item' },
                { label: '中文', value: 2, type: 'item' }
              ]}
              onSelect={(val) => {
                if (val === 0) i18n.changeLanguage('en');
                if (val === 1) i18n.changeLanguage('ko');
                if (val === 2) i18n.changeLanguage('zh');
              }}
              dropdownPosition="bottom"
              align="right"
            />
            <DropdownButton
              label={t('dropdown.links')}
              variant="ghost"
              options={[
                { label: t('links.matrixOS'), type: 'header' },
                { label: t('links.wiki'), url: 'https://matrix.203.io' },
                { label: t('links.editor'), url: 'https://edit.203.io/' },
                { label: t('links.devTool'), url: 'https://dev.203.io' },
                { type: 'divider' },
                { label: 'sihyunlights', type: 'header' },
                { label: 'sihyunlights.com', url: 'https://sihyunlights.com' }
              ]}
              dropdownPosition="bottom"
              align="right"
            />
          </div>
        </header>
      <div className={styles.container}>
        <main className={`${styles.main} ${currentPage === 'backup' ? styles.backupLayout : ''}`}>
          {/* Left Column */}
          <aside key={`left-${currentPage}`} className={`${styles.leftColumn} animate-fade-in-up`} style={{ animationDelay: '0.1s' }}>
            {currentPage === 'palette' ? (
              <div className={styles.sidebar}>
                  <MIDIConnection
                    onDeviceConnected={handleDeviceConnected}
                    onDeviceDisconnected={handleDeviceDisconnected}
                    selectedDevice={selectedDevice}
                    onDeviceSelect={handleDeviceSelect}
                  />
              </div>
            ) : (
              <div className={styles.sidebar}>
                  <HIDConnection
                    onConnected={setHidDevice}
                    onDisconnected={() => setHidDevice(null)}
                    connectedDevice={hidDevice}
                    hidInstance={hidInstance}
                  />
              </div>
            )}
            {currentPage === 'palette' && (
            <div className={styles.sidebar}>
                  <SectionHeader title={t('sections.preview')} />
                  <div className={`font-size-md`}>
                    {t('messages.previewDesc')}
                  </div>

                  <div className={styles.previewControls}>
                    <Button 
                        variant="ghost" 
                        onClick={() => previewInputRef.current?.click()}
                        className={`${styles.previewButton} font-size-sm`}
                    >
                      {previewFile ? previewFile.name : t('buttons.selectFile')}
                    </Button>
                    
                    <Button 
                        variant="primary"
                        disabled={!previewFile || isLightshowActive}
                        onClick={() => {
                            if (previewFile) {
                                playLightshow(previewFile);
                            }
                        }}
                    >
                      <i className="fa-solid fa-play" />
                    </Button>
                  </div>
                </div>
            )}
          </aside>

          {/* Center Column */}
          <div key={`center-${currentPage}`} className={`${styles.centerColumn} animate-fade-in-up`} style={{ animationDelay: '0.2s' }}>
            {currentPage === 'backup' ? (
                <div className={styles.workspace}>
                    <BackupRestore 
                      hidInstance={hidInstance}
                      connected={hidConnected}
                      connectedDevice={hidDevice}
                    />
                </div>
            ) : (
            <div className={styles.workspace}>
              <PaletteGrid
                palette={effectivePalette}
                selectedIndex={selectedColorIndex}
                onColorSelect={handlePadSelect}
                onDismissSelected={handlePadDismiss}
                selectedColor={selectedPadColor}
                onSelectedColorChange={(color) => (
                  selectedColorIndex !== undefined && handleColorChange(selectedColorIndex, color)
                )}
                lightshowColors={lightshowColors}
                isLightshowActive={isLightshowActive}
                animateTransitions={previewTransitionsEnabled && !isLightshowActive}
              />

              <div className={styles.controls}>
                <div className={styles.globalAdjustmentWrapper}>
                  <GlobalAdjustmentBox
                    saturation={globalSaturation}
                    contrast={globalContrast}
                    onSaturationChange={handleSaturationChange}
                    onContrastChange={handleContrastChange}
                    onReset={handleAdjustmentReset}
                    sliderShouldAnimate={sliderResetAnimating}
                  />
                </div>
                <div className={styles.globalAdjustmentWrapper}>
                  <HueAdjustmentBox
                    hueShift={globalHueShift}
                    onHueShiftChange={handleHueShiftChange}
                    onReset={handleHueReset}
                    sliderShouldAnimate={sliderResetAnimating}
                  />
                </div>
              </div>

              <div className={styles.actionBar}>
                <div className={styles.actionGroup}>
                  <DropdownButton 
                      label={t('buttons.upload')} 
                      options={slotOptions} 
                      onSelect={handleUpload}
                      disabled={isUploading || !matrixOS}
                      loading={isUploading}
                      loadingLabel={t('messages.uploading')}
                  />
                  
                  <DropdownButton 
                      label={t('buttons.delete')} 
                      options={slotOptions} 
                      onSelect={handleDelete}
                      disabled={isUploading || !matrixOS}
                      variant="danger"
                  />
                </div>

                <div className={styles.actionGroup}>
                  <Button
                      variant="secondary"
                      onClick={handleLoadFile}
                  >
                      {t('buttons.import')}
                  </Button>

                  <Button
                      variant="secondary"
                      onClick={handleSaveFile}
                  >
                      {t('buttons.export')}
                  </Button>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Right Column */}
          {currentPage === 'palette' && (
          <aside key={`right-${currentPage}`} className={`${styles.rightColumn} animate-fade-in-up`} style={{ animationDelay: '0.3s' }}>
            <div className={styles.sidebar}>
              <SectionHeader title={t('sections.presets')} />
              <div className={styles.presetList}>
                {INITIAL_PRESETS.map((preset: any) => (
                  <div key={preset.id} className={styles.presetItem}>
                    <Button
                      variant="ghost"
                      active={palette.name === preset.name}
                      onClick={() => handleApplyPreset(preset.url, preset.name)}
                      className={`${styles.presetButton} font-size-sm`}
                    >
                      {preset.name}
                    </Button>
                    <Button
                      variant="badge"
                      icon="circle-info"
                      title={t('buttons.info')}
                      onClick={(e) => {
                        e.stopPropagation();
                        showModal({
                          title: preset.name,
                          message: t(`presets.descriptions.${preset.cleanId}`),
                          type: 'alert'
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </aside>
          )}
        </main>
        <footer key={`footer-${currentPage}`} className={`${styles.footer} animate-fade-in-up`} style={{ animationDelay: '0.4s' }}>
          <div className="font-size-md">{t('footer.by')}</div>
          <div className="font-size-md color-muted font-weight-normal">{t('footer.status')}</div>
        </footer>
      </div>
      <input
        ref={previewInputRef}
        type="file"
        accept=".mid,.midi"
        onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreviewFile(file);
        }}
        className={styles.hiddenInput}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*"
        onChange={handleFileChange}
        className={styles.hiddenInput}
      />
    </div>
  );
};

export default function App() {
  return (
    <ModalProvider>
      <AppContent />
    </ModalProvider>
  );
}
