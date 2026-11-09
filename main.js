// 1. Impor module yang diperlukan dari firebase dan firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import {
  getFirestore,
  onSnapshot,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"
import QRCode from "https://esm.sh/qrcode@1.5.3"

// 2. konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA6I1Tvw61wzc6-2MVmcWXfZ17IwDYj7u4",
    authDomain: "rpl25-b6db4.firebaseapp.com",
    projectId: "rpl25-b6db4",
    storageBucket: "rpl25-b6db4.firebasestorage.app",
    messagingSenderId: "643920833293",
    appId: "1:643920833293:web:f5ac7fdc746e4e410d5e44"
}

// 3. Inisialisasi firebase dan firestore
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// kondisi/state aplikasi kasir 
let totalHarga = 0
let trxIdSekarang = ""
let unsubscribeListener = null

function bicara(teks) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(teks);
        utterance.lang = 'id-ID';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

// fungsi untuk tambah item ke keranjang 
window.tambahKeKeranjang = function(nama, harga) {
   totalHarga = totalHarga + harga
   document.getElementById('total-harga').innerText = `Rp.${totalHarga}`
   document.getElementById('btn-bayar').disabled = false
   bicara(`${nama} ditambahkan`)
}

// fungsi riset keranjang
window.resetKeranjang = function () {
  totalHarga = 0
  document.getElementById('total-harga').innerText = 'Rp. 0'
  document.getElementById('btn-bayar').disabled = true
  document.getElementById('qr-section').classList.add('hidden')
  
  // stop listener lama kalau ada
  if (unsubscribeListener) {
    unsubscribeListener()
    unsubscribeListener = null
  }
}

// fungsi membuat id transaksi qr code
window.buatTransaksiQR = async function () {
  if (totalHarga === 0) return

  trxIdSekarang = "TRX-"+Math.floor(1000 + Math.random() * 9000)
  
  document.getElementById('tx-id-display').innerText = trxIdSekarang
  document.getElementById('qr-section').classList.remove('hidden')
  
  const statusBox = document.getElementById('status-box')
  statusBox.className = "status-box status-pending"
  document.getElementById('status-teks').innerText = "Menunggu scan..."
  document.getElementById('qr-canvas').style.opacity = 1
  
  const elemenCanvas = document.getElementById('qr-canvas')
  try {
    await QRCode.toCanvas(elemenCanvas, trxIdSekarang, { width: 140, margin : 1 })
  } catch (error) {
    console.log("Gagal membuat QR", error)
  }
  
  const refTrx = doc(db,"transaksi",trxIdSekarang)
  try {
    await setDoc(refTrx, {
      total: totalHarga,
      status:'takterbayar',
      waktuBuat: Date.now()
    })
   } catch (error){
     console.log("Gagal menyimpan transaksi ke firestore", error)
   }
   
   listenStatusPembayaran(trxIdSekarang)
}

// fungsi listener status pembayaran di firestore
function listenStatusPembayaran(trxId) {
  const refTrx = doc(db,"transaksi", trxId)
  
  // hentikan listener lama dulu
  if (unsubscribeListener) unsubscribeListener()

  unsubscribeListener = onSnapshot(refTrx, (docSnapshot) => { 
      if (docSnapshot.exists() && docSnapshot.data().status == 'terbayar') {
        document.getElementById('status-box').className = "status-box status-success"
        document.getElementById('status-teks').innerText = "🎉 LUNAS"
        document.getElementById('qr-canvas').style.opacity = "0.2"
        
        bicara(`Pembayaran ${trxId} lunas, total ${totalHarga} rupiah`)
        
        if (unsubscribeListener) {
          unsubscribeListener()
          unsubscribeListener = null
        }
      }
    }
  )
}