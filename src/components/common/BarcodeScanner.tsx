'use client'

import { useState, useRef, useEffect } from 'react'
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { logSupabaseDB } from '@/lib/logger';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
  isOpen: boolean
}

export default function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen])

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)

      // Solicitar acesso à câmera traseira (preferencial para código de barras)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Câmera traseira
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // Iniciar detecção de código de barras
      startBarcodeDetection()
    } catch (err) {
      logSupabaseDB.failed('camera_access', err, {
        component: 'BarcodeScanner',
        metadata: {
          operation: 'startCamera',
          error: (err as any)?.message || 'Erro desconhecido'
        }
      });
      setError('Não foi possível acessar a câmera. Verifique as permissões.')
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const startBarcodeDetection = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    const detectBarcode = () => {
      if (!isScanning || !video.videoWidth || !video.videoHeight) {
        if (isScanning) {
          requestAnimationFrame(detectBarcode)
        }
        return
      }

      // Configurar canvas com as dimensões do vídeo
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Desenhar frame atual do vídeo no canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Tentar detectar código de barras usando BarcodeDetector (se disponível)
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector()
        
        barcodeDetector.detect(canvas)
          .then((barcodes: any[]) => {
            if (barcodes.length > 0) {
              const barcode = barcodes[0].rawValue
              onScan(barcode)
              onClose()
              return
            }
          })
          .catch((err: any) => {
            logSupabaseDB.failed('barcode_detection', err, {
              component: 'BarcodeScanner',
              metadata: {
                operation: 'detectBarcode',
                error: (err as any)?.message || 'Erro desconhecido'
              }
            });
          })
      }

      // Continuar detecção
      if (isScanning) {
        requestAnimationFrame(detectBarcode)
      }
    }

    // Aguardar vídeo carregar antes de iniciar detecção
    video.addEventListener('loadedmetadata', () => {
      detectBarcode()
    })

    if (video.readyState >= 2) {
      detectBarcode()
    }
  }

  const handleManualInput = () => {
    const input = prompt('Digite o código de barras manualmente:')
    if (input && input.trim()) {
      onScan(input.trim())
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <div className="relative w-full h-full max-w-md mx-auto">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Scanner de Código de Barras</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 p-1"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Área do vídeo */}
        <div className="relative w-full h-full">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-white p-6">
              <CameraIcon className="w-16 h-16 mb-4 text-gray-400" />
              <p className="text-center mb-4">{error}</p>
              <button
                onClick={handleManualInput}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg"
              >
                Digitar Manualmente
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              
              {/* Overlay de mira para código de barras */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Área de foco */}
                  <div className="w-64 h-32 border-2 border-white border-dashed rounded-lg bg-transparent"></div>
                  
                  {/* Cantos da mira */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-teal-400"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-teal-400"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-teal-400"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-teal-400"></div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer com instruções */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4">
          <div className="text-center">
            <p className="text-white text-sm mb-3">
              Posicione o código de barras dentro da área destacada
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleManualInput}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Digitar Código
              </button>
              {!error && (
                <button
                  onClick={() => {
                    stopCamera()
                    setTimeout(startCamera, 100)
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Recarregar Câmera
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Canvas oculto para processamento */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </div>
    </div>
  )
}

