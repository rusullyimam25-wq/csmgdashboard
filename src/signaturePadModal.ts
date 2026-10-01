/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Digital E-Signature Pad Modal for Customer & Officer (HTML5 Canvas)
 */

export interface SignatureModalOptions {
  title?: string;
  defaultSignerName?: string;
  roleLabel?: string;
  onSave: (signatureDataUrl: string, signerName: string) => void;
  onCancel: () => void;
}

export function openSignaturePadModal(options: SignatureModalOptions): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.cssText =
    "position:fixed; inset:0; z-index:99999; background:rgba(15,23,42,0.65); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:12px; font-family:'Plus Jakarta Sans', system-ui, sans-serif;";

  const card = document.createElement("div");
  card.className = "modal-card";
  card.style.cssText =
    "background:#FFFFFF; width:100%; max-width:480px; border-radius:18px; box-shadow:0 20px 40px rgba(0,0,0,0.25); border:1px solid #E2E8F0; overflow:hidden; display:flex; flex-direction:column; animation:modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);";

  // Header
  const header = document.createElement("div");
  header.style.cssText =
    "padding:16px 18px; background:linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color:#FFFFFF; display:flex; justify-content:space-between; align-items:center;";

  const titleBox = document.createElement("div");
  const title = document.createElement("h3");
  title.style.cssText = "margin:0; font-size:15px; font-weight:800; letter-spacing:-0.2px;";
  title.innerText = options.title || "✍️ E-Sign Tanda Tangan Pelanggan";

  const sub = document.createElement("div");
  sub.style.cssText = "font-size:11px; color:#E0F2FE; margin-top:2px;";
  sub.innerText = "Goreskan tanda tangan langsung pada area kanvas di bawah";
  titleBox.appendChild(title);
  titleBox.appendChild(sub);

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  closeBtn.style.cssText =
    "background:rgba(255,255,255,0.2); border:none; color:#FFFFFF; width:28px; height:28px; border-radius:50%; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center;";
  closeBtn.onclick = () => {
    overlay.remove();
    options.onCancel();
  };
  header.appendChild(titleBox);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement("div");
  body.style.cssText = "padding:16px; display:flex; flex-direction:column; gap:12px;";

  // Signer Name field
  const nameLabel = document.createElement("label");
  nameLabel.style.cssText = "font-size:11.5px; font-weight:700; color:#1E293B;";
  nameLabel.innerText = options.roleLabel || "Nama Penandatangan (Pelanggan):";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = options.defaultSignerName || "";
  nameInput.placeholder = "Masukkan nama lengkap penandatangan...";
  nameInput.style.cssText =
    "width:100%; box-sizing:border-box; padding:9px 12px; border-radius:8px; border:1px solid #CBD5E1; font-size:12px; font-weight:600; color:#0F172A; outline:none;";

  // Canvas Container
  const canvasWrap = document.createElement("div");
  canvasWrap.style.cssText =
    "background:#F8FAFC; border:2px dashed #94A3B8; border-radius:12px; padding:6px; position:relative; touch-action:none; user-select:none; -webkit-user-select:none;";

  const canvas = document.createElement("canvas");
  canvas.width = 440;
  canvas.height = 180;
  canvas.style.cssText =
    "width:100%; height:160px; display:block; background:#FFFFFF; border-radius:8px; cursor:crosshair; border:1px solid #E2E8F0;";

  const helperText = document.createElement("div");
  helperText.style.cssText =
    "position:absolute; bottom:12px; left:0; right:0; text-align:center; font-size:10px; color:#94A3B8; pointer-events:none;";
  helperText.innerText = "─── Silakan tanda tangan di dalam kotak putih ───";

  canvasWrap.appendChild(canvas);
  canvasWrap.appendChild(helperText);

  // Drawing logic
  const ctx = canvas.getContext("2d");
  let isDrawing = false;
  let hasSigned = false;
  let strokeColor = "#1E293B";

  if (ctx) {
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor;
  }

  function getCoords(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else if ("clientX" in e) {
      return {
        x: ((e as MouseEvent).clientX - rect.left) * scaleX,
        y: ((e as MouseEvent).clientY - rect.top) * scaleY,
      };
    }
    return { x: 0, y: 0 };
  }

  function startDraw(e: MouseEvent | TouchEvent) {
    if (e.cancelable) e.preventDefault();
    isDrawing = true;
    hasSigned = true;
    helperText.style.display = "none";
    const pos = getCoords(e);
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }

  function moveDraw(e: MouseEvent | TouchEvent) {
    if (!isDrawing || !ctx) return;
    if (e.cancelable) e.preventDefault();
    const pos = getCoords(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endDraw() {
    isDrawing = false;
    if (ctx) ctx.closePath();
  }

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", moveDraw);
  window.addEventListener("mouseup", endDraw);

  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", moveDraw, { passive: false });
  canvas.addEventListener("touchend", endDraw);
  canvas.addEventListener("touchcancel", endDraw);

  // Control Tools (Clear, Pen Colors)
  const toolsRow = document.createElement("div");
  toolsRow.style.cssText = "display:flex; justify-content:space-between; align-items:center;";

  const colorsBox = document.createElement("div");
  colorsBox.style.cssText = "display:flex; gap:6px; align-items:center;";
  const colorLabel = document.createElement("span");
  colorLabel.innerText = "Warna Tinta:";
  colorLabel.style.cssText = "font-size:11px; color:#64748B; font-weight:600;";
  colorsBox.appendChild(colorLabel);

  const colors = [
    { label: "Hitam", value: "#0F172A" },
    { label: "Biru Aetra", value: "#0284C7" },
    { label: "Biru Tua", value: "#1E3A8A" },
  ];

  colors.forEach((c) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.style.cssText = `width:20px; height:20px; border-radius:50%; background:${c.value}; border:2px solid ${c.value === strokeColor ? "#FFF" : "transparent"}; box-shadow:0 0 0 1.5px ${c.value === strokeColor ? "#0284C7" : "#CBD5E1"}; cursor:pointer;`;
    dot.onclick = () => {
      strokeColor = c.value;
      if (ctx) ctx.strokeStyle = strokeColor;
      colorsBox.querySelectorAll("button").forEach((b) => {
        b.style.boxShadow = "0 0 0 1.5px #CBD5E1";
      });
      dot.style.boxShadow = "0 0 0 2px #0284C7";
    };
    colorsBox.appendChild(dot);
  });

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.innerText = "🗑️ Bersihkan Kanvas";
  clearBtn.style.cssText =
    "background:#F1F5F9; border:1px solid #CBD5E1; color:#475569; font-size:11px; font-weight:700; padding:5px 10px; border-radius:6px; cursor:pointer;";
  clearBtn.onclick = () => {
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    hasSigned = false;
    helperText.style.display = "block";
  };

  toolsRow.appendChild(colorsBox);
  toolsRow.appendChild(clearBtn);

  body.appendChild(nameLabel);
  body.appendChild(nameInput);
  body.appendChild(canvasWrap);
  body.appendChild(toolsRow);

  // Footer Buttons
  const footer = document.createElement("div");
  footer.style.cssText =
    "padding:12px 18px; background:#F8FAFC; border-top:1px solid #E2E8F0; display:flex; justify-content:flex-end; gap:8px;";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.innerText = "Batal";
  cancelBtn.style.cssText =
    "padding:8px 14px; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:8px; font-size:12px; font-weight:700; color:#475569; cursor:pointer;";
  cancelBtn.onclick = () => {
    overlay.remove();
    options.onCancel();
  };

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.innerText = "💾 Simpan Tanda Tangan";
  saveBtn.style.cssText =
    "padding:8px 16px; background:linear-gradient(135deg, #10B981 0%, #059669 100%); border:none; border-radius:8px; font-size:12px; font-weight:800; color:#FFFFFF; cursor:pointer; box-shadow:0 2px 6px rgba(16,185,129,0.3);";
  saveBtn.onclick = () => {
    if (!hasSigned) {
      // @ts-ignore
      if (window.Swal) {
        // @ts-ignore
        window.Swal.fire({
          icon: "warning",
          title: "Tanda Tangan Kosong",
          text: "Silakan bubuhkan tanda tangan pada kanvas terlebih dahulu.",
        });
      } else {
        alert("Silakan bubuhkan tanda tangan pada kanvas terlebih dahulu.");
      }
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    const signerName = nameInput.value.trim() || options.defaultSignerName || "Pelanggan";
    overlay.remove();
    options.onSave(dataUrl, signerName);
  };

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

  card.appendChild(header);
  card.appendChild(body);
  card.appendChild(footer);
  overlay.appendChild(card);

  document.body.appendChild(overlay);
  return overlay;
}
