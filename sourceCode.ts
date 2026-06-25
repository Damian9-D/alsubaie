export const pythonSourceCode = `# -*- coding: utf-8 -*-
"""
قوات الطوارئ الخاصة – نظام إدارة ملفات PDF (ESE)
نسخة متطابقة مع تصميم الويب (Cairo Font & Modern UI)
"""

import os
import json
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageTk
from PyPDF2 import PdfMerger

# ==========================================
# إعدادات التصميم (مطابقة لنسخة الويب)
# ==========================================
COLORS = {
    "header_bg": "#1e293b",      # Slate 800
    "header_text": "#ffffff",    # White
    "sub_text": "#cbd5e1",       # Slate 300
    "accent_red": "#dc2626",     # Red 600
    "bg_main": "#f3f4f6",        # Gray 100
    "card_bg": "#ffffff",        # White
    "info_bg": "#eff6ff",        # Blue 50
    "info_text": "#1e3a8a",      # Blue 900
    "btn_bg": "#1e293b",         # Slate 800
    "btn_fg": "#ffffff",         # White
    "btn_hover": "#334155"       # Slate 700
}

# محاولة استخدام خط Cairo إذا كان مثبتاً، وإلا فالخطوط البديلة
FONT_FAMILY = "Cairo"
FONT_TITLE = (FONT_FAMILY, 16, "bold")
FONT_SUBTITLE = (FONT_FAMILY, 10)
FONT_NORMAL = (FONT_FAMILY, 10)
FONT_BTN = (FONT_FAMILY, 11, "bold")

SETTINGS_FILE = "pdf_tool_settings.json"

def load_last_folder():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("last_folder", "")
        except Exception:
            return ""
    return ""

def save_last_folder(folder_path: str):
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump({"last_folder": folder_path}, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

class PDFToolApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("قوات الطوارئ الخاصة – نظام إدارة ملفات PDF")
        self.root.geometry("800x600")
        self.root.configure(bg=COLORS["bg_main"])
        
        # تحميل آخر مجلد
        self.last_folder = load_last_folder()

        # إعداد الستايل (Theme)
        self.setup_styles()

        # =======================
        # البطاقة الرئيسية (Container)
        # =======================
        # إطار أبيض في المنتصف يحاكي الـ Card في الويب
        self.main_card = tk.Frame(root, bg=COLORS["card_bg"], padx=0, pady=0)
        self.main_card.place(relx=0.5, rely=0.5, anchor="center", width=700, height=520)

        # =======================
        # الهيدر (Header)
        # =======================
        header_frame = tk.Frame(self.main_card, bg=COLORS["header_bg"], height=100)
        header_frame.pack(fill="x", side="top")
        
        # الشعار والعناوين
        # ملاحظة: الصور تحتاج لتحميل، هنا نضع مكاناً محجوزاً أو نحملها إذا وجدت
        self.logo_img = None
        logo_path = os.path.join(os.path.dirname(__file__), "logo.png")
        if os.path.exists(logo_path):
            try:
                pil_img = Image.open(logo_path).resize((70, 70), Image.LANCZOS)
                self.logo_img = ImageTk.PhotoImage(pil_img)
                lbl_logo = tk.Label(header_frame, image=self.logo_img, bg=COLORS["header_bg"])
                lbl_logo.pack(side="right", padx=20, pady=15)
            except:
                pass

        # نصوص الهيدر
        title_container = tk.Frame(header_frame, bg=COLORS["header_bg"])
        title_container.pack(side="right", pady=15)
        
        lbl_title = tk.Label(title_container, text="قوات الطوارئ الخاصة", 
                             font=FONT_TITLE, bg=COLORS["header_bg"], fg=COLORS["header_text"], justify="right")
        lbl_title.pack(anchor="e")
        
        lbl_sub = tk.Label(title_container, text="نظام إدارة ملفات PDF (ESE)", 
                           font=FONT_SUBTITLE, bg=COLORS["header_bg"], fg=COLORS["sub_text"], justify="right")
        lbl_sub.pack(anchor="e")

        # الخط الأحمر الفاصل (Gradient Decoration emulation)
        line_frame = tk.Frame(self.main_card, bg=COLORS["accent_red"], height=4)
        line_frame.pack(fill="x")

        # =======================
        # المحتوى (Content)
        # =======================
        content_frame = tk.Frame(self.main_card, bg=COLORS["card_bg"], padx=30, pady=20)
        content_frame.pack(fill="both", expand=True)

        desc_text = "البرنامج يساعدك على دمج ملفات PDF بعدد لا نهائي،\nوكذلك تحويل عدد لا نهائي من الصور إلى ملف PDF واحد."
        lbl_desc = tk.Label(content_frame, text=desc_text, font=FONT_NORMAL, 
                            bg=COLORS["card_bg"], fg="#475569", justify="right")
        lbl_desc.pack(pady=(0, 20), anchor="e")

        # الأزرار
        self.btn_merge = tk.Button(content_frame, text="🗂  دمج ملفات PDF (عدد لا نهائي)", 
                                   command=self.merge_pdfs, 
                                   bg=COLORS["btn_bg"], fg=COLORS["btn_fg"], 
                                   font=FONT_BTN, relief="flat", padx=20, pady=10, cursor="hand2")
        self.btn_merge.pack(fill="x", pady=5)

        self.btn_img = tk.Button(content_frame, text="🖼  تحويل الصور إلى ملف PDF واحد", 
                                 command=self.images_to_pdf, 
                                 bg=COLORS["btn_bg"], fg=COLORS["btn_fg"], 
                                 font=FONT_BTN, relief="flat", padx=20, pady=10, cursor="hand2")
        self.btn_img.pack(fill="x", pady=5)

        # زر فتح المجلد (ستايل ثانوي)
        self.btn_open = tk.Button(content_frame, text="📂  فتح آخر مجلد حفظ", 
                                  command=self.open_last_folder, 
                                  bg="#f1f5f9", fg="#1e293b", 
                                  font=FONT_NORMAL, relief="flat", padx=20, pady=8, cursor="hand2")
        self.btn_open.pack(fill="x", pady=(5, 20))

        # صندوق الملاحظات (Info Card)
        info_frame = tk.Frame(content_frame, bg=COLORS["info_bg"], padx=15, pady=15)
        info_frame.pack(fill="both", expand=True)
        
        # شريط جانبي أزرق للملاحظات
        border_info = tk.Frame(info_frame, bg="#2563eb", width=4)
        border_info.pack(side="right", fill="y")
        
        info_lbl = tk.Label(info_frame, text="ملاحظات الاستخدام:", 
                            font=(FONT_FAMILY, 11, "bold"), bg=COLORS["info_bg"], fg=COLORS["info_text"])
        info_lbl.pack(anchor="e", padx=(0, 10))
        
        notes = (
            "• لا يوجد حد لعدد ملفات PDF التي يمكن دمجها.\n"
            "• يتم حفظ الملفات ومعالجتها محلياً بسرعة عالية.\n"
            "• يفضّل توحيد أبعاد الصور للحصول على أفضل نتيجة طباعة."
        )
        info_content = tk.Label(info_frame, text=notes, font=FONT_NORMAL, 
                                bg=COLORS["info_bg"], fg=COLORS["info_text"], justify="right")
        info_content.pack(anchor="e", padx=(0, 10))

        # Copyright
        lbl_copy = tk.Label(self.main_card, text="نسخة متوافقة v1.0", bg=COLORS["card_bg"], fg="#94a3b8", font=("Arial", 8))
        lbl_copy.pack(side="bottom", pady=5)

    def setup_styles(self):
        # تحسين شكل الأزرار عند المرور (Hover)
        def on_enter(e):
            if e.widget['bg'] == COLORS["btn_bg"]:
                e.widget['bg'] = COLORS["btn_hover"]
        def on_leave(e):
            if e.widget['bg'] == COLORS["btn_hover"]:
                e.widget['bg'] = COLORS["btn_bg"]

        self.root.bind_class("Button", "<Enter>", on_enter)
        self.root.bind_class("Button", "<Leave>", on_leave)

    def open_last_folder(self):
        if not self.last_folder or not os.path.exists(self.last_folder):
            messagebox.showinfo("تنبيه", "لا يوجد مجلد محفوظ حتى الآن.")
            return
        try:
            os.startfile(self.last_folder)
        except Exception as e:
            messagebox.showerror("خطأ", str(e))

    def merge_pdfs(self):
        initial_dir = self.last_folder if os.path.exists(self.last_folder) else os.getcwd()
        file_paths = filedialog.askopenfilenames(
            title="اختر ملفات PDF", filetypes=[("PDF Files", "*.pdf")], initialdir=initial_dir
        )
        if not file_paths or len(file_paths) < 2:
            if file_paths: messagebox.showwarning("تنبيه", "يجب اختيار ملفين على الأقل.")
            return

        output_path = filedialog.asksaveasfilename(
            title="حفظ الملف المدمج", defaultextension=".pdf", 
            filetypes=[("PDF Files", "*.pdf")], initialfile="merged.pdf", initialdir=initial_dir
        )
        if not output_path: return

        try:
            merger = PdfMerger()
            for path in file_paths: merger.append(path)
            merger.write(output_path)
            merger.close()
            
            self.last_folder = os.path.dirname(output_path)
            save_last_folder(self.last_folder)
            messagebox.showinfo("تم بنجاح", "تم دمج الملفات بنجاح!")
        except Exception as e:
            messagebox.showerror("خطأ", str(e))

    def images_to_pdf(self):
        initial_dir = self.last_folder if os.path.exists(self.last_folder) else os.getcwd()
        img_paths = filedialog.askopenfilenames(
            title="اختر الصور", 
            filetypes=[("Images", "*.jpg;*.jpeg;*.png;*.bmp;*.webp")], 
            initialdir=initial_dir
        )
        if not img_paths: return

        output_path = filedialog.asksaveasfilename(
            title="حفظ ملف PDF", defaultextension=".pdf", 
            filetypes=[("PDF Files", "*.pdf")], initialfile="images.pdf", initialdir=initial_dir
        )
        if not output_path: return

        try:
            images = []
            a4_w, a4_h = 1240, 1754 # ~150 DPI A4
            for p in img_paths:
                img = Image.open(p).convert("RGB")
                img.thumbnail((a4_w-100, a4_h-100), Image.LANCZOS)
                bg = Image.new("RGB", (a4_w, a4_h), "white")
                bg.paste(img, ((a4_w-img.width)//2, (a4_h-img.height)//2))
                images.append(bg)
            
            if images:
                images[0].save(output_path, save_all=True, append_images=images[1:])
            
            self.last_folder = os.path.dirname(output_path)
            save_last_folder(self.last_folder)
            messagebox.showinfo("تم بنجاح", "تم تحويل الصور إلى PDF بنجاح!")
        except Exception as e:
            messagebox.showerror("خطأ", str(e))

if __name__ == "__main__":
    root = tk.Tk()
    app = PDFToolApp(root)
    root.mainloop()
`;
