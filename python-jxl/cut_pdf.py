from datetime import datetime
from PyPDF2 import PdfReader, PdfWriter, PdfMerger, PaperSize, Transformation
from PyPDF2.generic import AnnotationBuilder
from reportlab.pdfgen import canvas
from reportlab.lib import pagesizes
from reportlab.lib.units import inch, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


import os
import sys
import json
import math
import shutil

def clean_backslashes(s):
    return s.replace("./","")


ARGS = list(map(clean_backslashes, sys.argv))
DEFAULT_DIR="./"

if(len(ARGS) < 2):
    print("I need the folder name where all the pdfs are => '../static/html/???' => USAGE : python cut_pdf.py [DIRNAME]")
    sys.exit()
else:
    PDF_NAME="generated_"+ARGS[1]+".pdf"
    if(ARGS[1] == "FROMNODE" or ARGS[1] == "FROMNPM"):
        if(len(ARGS) < 3):
            print("I need the folder name where all the pdfs are => '../static/html/???' => USAGE : python cut_pdf.py [DIRNAME]")
            sys.exit()
        PDF_NAME="generated_"+ARGS[2]+".pdf"
        DEFAULT_DIR="./python-jxl"
    if(ARGS[1] == "FROMNODE"):
        PAGE_SIZE=ARGS[3]
    elif(ARGS[1] == "FROMNPM"):
        PAGE_SIZE=ARGS[2]
    else:
        if(len(ARGS) > 2):
            PAGE_SIZE=ARGS[2]
        else:
            PAGE_SIZE = None

if(PAGE_SIZE == "undefined" or PAGE_SIZE == None):
    PAGE_SIZE="EXECUTIVE"

os.chdir(DEFAULT_DIR)


listFiles = os.listdir('../fonts')
for name in listFiles:
    if(".ttf" in name):
        [fn, ext] = name.split(".")
        pdfmetrics.registerFont(TTFont(fn, "../fonts/"+name))

PAGE_SIZES = {
    "A0" : pagesizes.A0,
    "A1" : pagesizes.A1,
    "A2" : pagesizes.A2,
    "A3" : pagesizes.A3,
    "A4" : pagesizes.A4,
    "A5" : pagesizes.A5,
    "A6" : pagesizes.A6,
    "A7" : pagesizes.A7,
    "LETTER" : pagesizes.LETTER,
    "letter" : pagesizes.LETTER,
    "EXECUTIVE" : [504.0, 720.0]
}

PAGE_DIMENSIONS = PAGE_SIZES[PAGE_SIZE]

# 1 inch == 72 pt
def inch_to_pt(num):
    return num/72

def pt_to_mm(pt):
    inch=pt/72
    return inch*25.4

def mm_to_pt(mm):
    inch=mm/25.4
    return inch*72

# EXECUTIVE_WIDTH = 504.0
PAGE_WIDTH = PAGE_DIMENSIONS[0]
# EXECUTIVE_HEIGHT = 720.0
PAGE_HEIGHT = PAGE_DIMENSIONS[1]

SCALE_WIDTH_X = PAGE_WIDTH / 504.0
SCALE_HEIGHT_Y = PAGE_HEIGHT / 720.0

A3MM_WIDTH = 420
A3MM_HEIGHT = 297

OFFSET_WIDTH = (mm_to_pt(A3MM_WIDTH) - 1008)/2
OFFSET_HEIGHT = (mm_to_pt(A3MM_HEIGHT) - 720)/2

def calc_offset_text(txt=""):
    return len(txt)*2

def crop():
    doc=ARGS[1]
    reader = PdfReader("{}".format(doc))
    writer = PdfWriter()
    nbPages = len(reader.pages)
    for i in range(nbPages):
        page = reader.pages[i]

        w = int(page.mediabox.width)
        h = int(page.mediabox.height)
        
        page.mediabox.right = w/2.0+PAGE_WIDTH/2.0
        page.mediabox.left = w/2.0-PAGE_WIDTH/2.0
        page.mediabox.top = h/2.0+PAGE_HEIGHT/2.0
        page.mediabox.bottom = h/2.0-PAGE_HEIGHT/2.0
        # print("width == {} pt or {} mm".format(w, pt_to_mm(w)))
        # print("height == {} pt or {} mm".format(h, pt_to_mm(h)))

        writer.add_page(page)

    docName="cropped_{}".format(doc)
    with open(docName, "wb") as fp:
        writer.write(fp)

    return docName

def readJson(name="manifest.json"):
    with open(name, "r") as fp:
        return json.loads(fp.read())
    
def OLD_solving_all_the_problems_in_the_world_at_the_same_time(font="GentiumBookPlus-Regular"):
    writer = PdfWriter()
    config = readJson()
    conf_len = len(config)
    numCurrentPage = 1
    for_ids = {}
    for obj in range(conf_len):
        if(config[obj].get("for") != None):
            for_ids[config[obj].get("for")] = config[obj].get("id")
    for i in range(conf_len):
        if(config[i].get("for") != None):
            continue
        id=config[i].get("id")
        typePage=config[i].get("type")
        startOn=config[i].get("startOn")
        makeFromDouble=config[i].get("makeFromDouble")
        showPageNumber=config[i].get("showPageNumber")
        name="{}.pdf".format(id)
        reader = PdfReader(name)
        if(makeFromDouble):
            reader2 = PdfReader(name)
        else:
            reader2 = None
        if(id in for_ids.keys()):
            read3 = PdfReader("{}.pdf".format(for_ids.get(id)))
        else:
            read3 = None
        nbPages = len(reader.pages)

        itsTheFirstPage=True
        if numCurrentPage%2 != 0 and startOn == "verso":
            writer.add_blank_page(PAGE_WIDTH, PAGE_HEIGHT)
            numCurrentPage+=1
        if numCurrentPage%2 == 0 and startOn == "recto":
            writer.add_blank_page(PAGE_WIDTH, PAGE_HEIGHT)
            numCurrentPage+=1
        if(not makeFromDouble):
            for j in range(nbPages):
                cname = "canvas_{}_tmp.pdf".format(j)
                c = canvas.Canvas(cname, pagesize=pagesizes.A3)
                page = reader.pages[j]

                w = int(page.mediabox.width)
                h = int(page.mediabox.height)

                if(showPageNumber):
                    to = c.beginText()
                    to.setTextOrigin(w/2, h/2 - 360 + mm_to_pt(10))
                    to.setFont(font, 9)
                    to.textLine("{}".format(numCurrentPage))
                    c.drawText(to)
                c.showPage()
                c.save()

                tmpTxt = PdfReader(cname)

                page.merge_page(tmpTxt.pages[0])
                if(read3 != None and numCurrentPage!=0 and not itsTheFirstPage and typePage == "2Column"):
                    if(numCurrentPage%2 == 0):
                        page.merge_page(read3.pages[1])
                    else:
                        page.merge_page(read3.pages[0])


                numCurrentPage+=1
                page.mediabox.right = w/2.0+PAGE_WIDTH/2.0
                page.mediabox.left = w/2.0-PAGE_WIDTH/2.0
                page.mediabox.top = h/2.0+PAGE_HEIGHT/2.0
                page.mediabox.bottom = h/2.0-PAGE_HEIGHT/2.0
                # op = Transformation().scale(sx=SCALE_WIDTH_X, sy=SCALE_HEIGHT_Y).translate(tx=(1-SCALE_WIDTH_X)*w/2, ty=(1-SCALE_HEIGHT_Y)*h/2)
                # page.add_transformation(op)
                page.scale_by(SCALE_WIDTH_X)
                writer.add_page(page)

                if(itsTheFirstPage and typePage == "2Column"):
                    itsTheFirstPage = False
                os.remove(cname)
        else:
            for k in range(nbPages):
                cname = "canvas_{}_juxta.pdf".format(k)
                c = canvas.Canvas(cname, pagesize=pagesizes.landscape(pagesizes.A3))
                # readerL = PdfReader("{}".format(name))
                # readerR = PdfReader("{}".format(name))
                # writer = PdfWriter()
                pageR = reader.pages[k]
                pageL = reader2.pages[k]

                w = int(pageR.mediabox.width)
                h = int(pageR.mediabox.height)

                A3ptw = mm_to_pt(420)
                A3pth = mm_to_pt(297)

                offset_width = (A3ptw - 1008)/2
                offset_height = (A3pth - 720)/2

                if(showPageNumber):
                    to = c.beginText()
                    to.setTextOrigin(44 + (388/2) + offset_width - calc_offset_text("{}".format(numCurrentPage)), offset_height + mm_to_pt(10))
                    to.setFont(font, 9)
                    to.textLine("{}".format(numCurrentPage))
                    c.drawText(to)

                numCurrentPage+=1
                if(showPageNumber):
                    to = c.beginText()
                    to.setTextOrigin(w - 44 - (388/2) - offset_width - calc_offset_text("{}".format(numCurrentPage)), offset_height + mm_to_pt(10))
                    to.setFont(font, 9)
                    to.textLine("{}".format(numCurrentPage))
                    c.drawText(to)

                numCurrentPage+=1

                c.showPage()
                c.save()

                tmpTxt = PdfReader(cname)

                pageR.merge_page(tmpTxt.pages[0])
                pageL.merge_page(tmpTxt.pages[0])
                if(read3 != None and not itsTheFirstPage and typePage == "4ColumnSpread"):
                    pageR.merge_page(read3.pages[0])
                    pageL.merge_page(read3.pages[1])

                pageL.mediabox.right = math.floor(w/2.0)
                pageL.mediabox.left = math.floor(offset_width)
                pageL.mediabox.top = math.floor(float(pageL.mediabox.height) - offset_height) - 0.5
                pageL.mediabox.bottom = math.floor(offset_height) + 0.5

                pageR.mediabox.left = math.floor(w/2.0)
                pageR.mediabox.right = w - math.floor(offset_width) - 1
                pageR.mediabox.top = math.floor(float(pageR.mediabox.height) - offset_height) - 0.5
                pageR.mediabox.bottom = math.floor(offset_height) + 0.5

                # op = Transformation().scale(sx=SCALE_WIDTH_X, sy=SCALE_HEIGHT_Y).translate(tx=(1-SCALE_WIDTH_X)*w/2, ty=(1-SCALE_HEIGHT_Y)*h/2)
                pageR.scale_by(SCALE_WIDTH_X)
                pageL.scale_by(SCALE_WIDTH_X)
                # pageR.add_transformation(op)
                # pageL.add_transformation(op)
                writer.add_page(pageL)
                writer.add_page(pageR)

                os.remove(cname)
                if(itsTheFirstPage and typePage == "4ColumnSpread"):
                    itsTheFirstPage = False
        

    with open(PDF_NAME, "wb") as fp:
        writer.write(fp)
        print("{} succesfully created in {}/{}".format(PDF_NAME, DEFAULT_DIR, PDF_NAME))

    print("{} pages!".format(len(writer.pages)))


def create_page_num(page, num, double=False, textFont="GentiumBookPlus-Regular", textSize=9):
    cname = "canvas_{}_tmp.pdf".format(num)
    c = canvas.Canvas(cname, pagesize=pagesizes.A3)

    w = int(page.mediabox.width)
    h = int(page.mediabox.height)

    if(double):
        to = c.beginText()
        to.setTextOrigin(44 + (388/2) + OFFSET_WIDTH - calc_offset_text("{}".format(num)), OFFSET_HEIGHT + mm_to_pt(10))
        to.setFont(textFont, textSize)
        to.textLine("{}".format(num))
        c.drawText(to)

        to = c.beginText()
        to.setTextOrigin(w - 44 - (388/2) - OFFSET_WIDTH - calc_offset_text("{}".format(num+1)), OFFSET_HEIGHT + mm_to_pt(10))
        to.setFont(textFont, textSize)
        to.textLine("{}".format(num+1))
        c.drawText(to)
    else:
        to = c.beginText()
        to.setTextOrigin(w/2, h/2 - 360 + mm_to_pt(10))
        to.setFont(textFont, textSize)
        to.textLine("{}".format(num))
        c.drawText(to)
    c.showPage()
    c.save()

    return cname

def cut_page(page, left, right, top, bottom):
    page.mediabox.right = right
    page.mediabox.left = left
    page.mediabox.top = top
    page.mediabox.bottom = bottom
    return page

def solving_all_the_problems_in_the_world_at_the_same_time():
    writer = PdfWriter()
    writer.add_blank_page(PAGE_WIDTH, PAGE_HEIGHT)
    writer.add_blank_page(PAGE_WIDTH, PAGE_HEIGHT)
    config = readJson()
    numCurrentPage = 1
    for i in range(len(config)):
        id=config[i]["id"]
        type=config[i]["type"]
        startOn=config[i]["startOn"]
        makeFromDouble=config[i]["makeFromDouble"]
        showPageNumber=config[i]["showPageNumber"]
        name="{}.pdf".format(id)
        reader = PdfReader(name)
        nbPages = len(reader.pages)

        if numCurrentPage%2 != 0 and startOn == "verso":
            writer.add_blank_page(PAGE_WIDTH, PAGE_HEIGHT)
            numCurrentPage+=1
        if(not makeFromDouble):
            for page in reader.pages:
                w = int(page.mediabox.width)
                h = int(page.mediabox.height)

                if(showPageNumber):
                    cname = create_page_num(page, numCurrentPage)
                    tmpTxt = PdfReader(cname)
                    page.merge_page(tmpTxt.pages[0])
                    os.remove(cname)
                
                numCurrentPage+=1
                page = cut_page(
                    page,
                    w/2.0-PAGE_WIDTH/2.0,
                    w/2.0+PAGE_WIDTH/2.0,
                    h/2.0+PAGE_HEIGHT/2.0,
                    h/2.0-PAGE_HEIGHT/2.0
                )
                writer.add_page(page)
        else:
            reader2 = PdfReader(name)
            for k in range(nbPages):
                pageR = reader.pages[k]
                pageL = reader2.pages[k]

                w = int(pageR.mediabox.width)
                h = int(pageR.mediabox.height)

                if(showPageNumber):
                    cname = create_page_num(page, numCurrentPage, double=True)
                    tmpTxt = PdfReader(cname)
                    pageL.merge_page(tmpTxt.pages[0])
                    pageR.merge_page(tmpTxt.pages[0])
                    os.remove(cname)

                numCurrentPage+=2

                pageL = cut_page(
                    pageL,
                    math.floor(OFFSET_WIDTH),
                    math.floor(w/2.0),
                    math.floor(float(pageL.mediabox.height) - OFFSET_HEIGHT) - 0.5,
                    math.floor(OFFSET_HEIGHT) + 0.5
                )

                pageR = cut_page(
                    pageR,
                    math.floor(w/2.0),
                    w - math.floor(OFFSET_WIDTH) - 1,
                    math.floor(float(pageR.mediabox.height) - OFFSET_HEIGHT) - 0.5,
                    math.floor(OFFSET_HEIGHT) + 0.5
                )

                writer.add_page(pageL)
                writer.add_page(pageR)

    with open("{}".format(PDF_NAME), "wb") as fp:
        writer.write(fp)

    print("{} pages!".format(len(writer.pages)))


def vertical():
    doc=ARGS[1]
    reader = PdfReader("{}".format(doc))
    writer = PdfWriter()
    nbPages = len(reader.pages)
    for i in range(nbPages):
        cname = "canvas_{}_tmp.pdf".format(i)
        c = canvas.Canvas(cname, pagesize=pagesizes.A3)
        page = reader.pages[i]
        # writer.add_page(page)

        w = int(page.mediabox.width)
        h = int(page.mediabox.height)

        to = c.beginText()
        to.setTextOrigin(w/2, h/2 - 360 + mm_to_pt(10))
        to.setFont("GentiumBookPlus-Regular", 9)
        to.textLine("- {} -".format(i+1))
        c.drawText(to)
        c.showPage()
        c.save()

        tmpTxt = PdfReader(cname)

        page.merge_page(tmpTxt.pages[0])

        page.mediabox.right = w/2.0+PAGE_WIDTH/2.0
        page.mediabox.left = w/2.0-PAGE_WIDTH/2.0
        page.mediabox.top = h/2.0+PAGE_HEIGHT/2.0
        page.mediabox.bottom = h/2.0-PAGE_HEIGHT/2.0
        writer.add_page(page)

        os.remove(cname)

    with open("pages_cropped_{}".format(doc), "wb") as fp:
        writer.write(fp)


def juxta():
    cname = "canvas_{}_tmp.pdf".format(1)
    c = canvas.Canvas(cname, pagesize=pagesizes.landscape(pagesizes.A3))
    readerL = PdfReader("{}".format(ARGS[1]))
    readerR = PdfReader("{}".format(ARGS[1]))
    writer = PdfWriter()
    page1R = readerR.pages[2]
    page1L = readerL.pages[2]

    w = int(page1R.mediabox.width)
    h = int(page1R.mediabox.height)

    A3ptw = mm_to_pt(420)
    A3pth = mm_to_pt(297)

    offset_width = (A3ptw - 1008)/2
    offset_height = (A3pth - 720)/2

    to = c.beginText()
    to.setTextOrigin(44 + (388/2) + offset_width - calc_offset_text("1"), offset_height  + mm_to_pt(10) )
    to.setFont("GentiumBookPlus-Regular", 9)
    to.textLine("{}".format(1))
    c.drawText(to)

    to = c.beginText()
    to.setTextOrigin(w - 44 - (388/2) - offset_width - calc_offset_text("2"), offset_height  + mm_to_pt(10) )
    to.setFont("GentiumBookPlus-Regular", 9)
    to.textLine("{}".format(2))
    c.drawText(to)

    c.showPage()
    c.save()

    tmpTxt = PdfReader(cname)

    page1R.merge_page(tmpTxt.pages[0])
    page1L.merge_page(tmpTxt.pages[0])

    page1L.mediabox.right = math.floor(w/2.0)
    page1L.mediabox.left = math.floor(offset_width)
    page1L.mediabox.top = math.floor(float(page1L.mediabox.height) - offset_height) - 0.5
    page1L.mediabox.bottom = math.floor(offset_height) + 0.5

    page1R.mediabox.left = math.floor(w/2.0)
    page1R.mediabox.right = w - math.floor(offset_width) - 1
    page1R.mediabox.top = math.floor(float(page1R.mediabox.height) - offset_height) - 0.5
    page1R.mediabox.bottom = math.floor(offset_height) + 0.5
    print (page1R.mediabox.height)
    print (page1R.mediabox.width)

    writer.add_page(page1L)
    writer.add_page(page1R)
    
    with open("TEST_juxta_output.pdf", "wb") as fp:
        writer.write(fp)


def cut_pages():
    name=ARGS[1]
    # start=int(ARGS[2])
    # range=int(ARGS[3])

    reader = PdfReader(name)
    writer = PdfWriter()

    pages=reader.pages

    nbPages=len(pages)
    # if start < 1 or start >= nbPages or start+range > nbPages or start+range < 1:
    #     print("wrong range")
    #     exit()
    # for i in range(5,5):
    page = reader.pages[3]
    page.compress_content_streams()
    writer.add_page(page)

    with open("cut_{}".format(name), "wb") as f:
        writer.write(f)


def reduce_pdf(name):
    reader = PdfReader(name)
    writer = PdfWriter()

    for page in reader.pages:
        page.compress_content_streams()  # This is CPU intensive!
        writer.add_page(page)

    writer.add_metadata(reader.metadata)

    with open("compressed_{}".format(name), "wb") as f:
        writer.write(f)

def save_pdf():
    pdfPath="../static/html/{}/pdf/".format(ARGS[1])
    if(ARGS[1] == "FROMNODE" or ARGS[1] == "FROMNPM"):
        pdfPath="../static/html/{}/pdf/".format(ARGS[2])
    if(os.path.exists("{}manifest.json".format(pdfPath))):
        destination_folder = "./"
        try:
            # fetch all files
            for file_name in os.listdir(pdfPath):
                # construct full file path
                source = pdfPath + file_name
                destination = destination_folder + file_name
                # copy only files
                if os.path.isfile(source) and "cv.json" not in file_name:
                    shutil.copy(source, destination)
                    print('copied', file_name)
            print("running...")
            OLD_solving_all_the_problems_in_the_world_at_the_same_time()
            reduce_pdf("generated_output.pdf")

            with open("logs.txt", "a") as f:
                f.write("{} [SUCCESS] : file '{}' generated\n".format(datetime.now(), PDF_NAME))
                f.write("{} [ARGS] {}\n".format(datetime.now(), " ".join(ARGS)))
                f.close()
        except Exception as e:
            with open("logs.txt", "a") as f:
                f.write("{} [ERROR] :".format(datetime.now()))
                f.write("{}\n\n".format(e))
                f.close()
            raise FileNotFoundError(e)
        finally:
            listFiles = os.listdir('./')
            for name in listFiles:
                if((".pdf" in name and "generated_" not in name) or name == "manifest.json"):
                    os.remove(name)
            with open("logs.txt", "a") as f:
                f.write("{} [DIRECTORY CLEANED]\n".format(datetime.now()))
                f.close()
    else:
        with open("logs.txt", "a") as f:
            f.write("{} [ERROR] : path doesn't exists : {}\n\tHere's the root path => {}".format(datetime.now(),pdfPath,os.path.dirname(os.path.realpath(__file__))))
            f.write("\n")
            f.write("{} Have you launched the node script yet? (npm start [...args])\n".format(datetime.now()))
            f.close()
        print("[ERROR] : path does not exists : {}\n\tHere's the root path => {}".format(pdfPath,os.path.dirname(os.path.realpath(__file__))))
        print("\tHave you launched the node script yet? (npm start [...args])\n")


if __name__ == "__main__":
    save_pdf()