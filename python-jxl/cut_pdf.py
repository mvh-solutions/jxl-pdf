import os
from PyPDF2 import PdfReader, PdfWriter, PdfMerger, PaperSize, Transformation
from PyPDF2.generic import AnnotationBuilder
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, portrait, landscape
from reportlab.lib.units import inch, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


import sys
import json
import math
import shutil

listFiles = os.listdir('./fonts')
for name in listFiles:
    if(".ttf" in name):
        [fn, ext] = name.split(".")
        pdfmetrics.registerFont(TTFont(fn, name))

# 1 inch == 72 pt
def inch_to_pt(num):
    return num/72

def pt_to_mm(pt):
    inch=pt/72
    return inch*25.4

def mm_to_pt(mm):
    inch=mm/25.4
    return inch*72

EXECUTIVE_WIDTH = 504.0
EXECUTIVE_HEIGHT = 720.0

A3MM_WIDTH = 420
A3MM_HEIGHT = 297

OFFSET_WIDTH = (mm_to_pt(A3MM_WIDTH) - 1008)/2
OFFSET_HEIGHT = (mm_to_pt(A3MM_HEIGHT) - 720)/2

args = sys.argv


def calc_offset_text(txt=""):
    return len(txt)*2

def crop():
    doc=args[1]
    reader = PdfReader("{}".format(doc))
    writer = PdfWriter()
    nbPages = len(reader.pages)
    for i in range(nbPages):
        page = reader.pages[i]

        w = int(page.mediabox.width)
        h = int(page.mediabox.height)
        
        page.mediabox.right = w/2.0+EXECUTIVE_WIDTH/2.0
        page.mediabox.left = w/2.0-EXECUTIVE_WIDTH/2.0
        page.mediabox.top = h/2.0+EXECUTIVE_HEIGHT/2.0
        page.mediabox.bottom = h/2.0-EXECUTIVE_HEIGHT/2.0
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
    # writer.add_blank_page(EXECUTIVE_WIDTH, EXECUTIVE_HEIGHT)
    # writer.add_blank_page(EXECUTIVE_WIDTH, EXECUTIVE_HEIGHT)
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
        type=config[i].get("type")
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
            writer.add_blank_page(EXECUTIVE_WIDTH, EXECUTIVE_HEIGHT)
            numCurrentPage+=1
        if numCurrentPage%2 == 0 and startOn == "recto":
            writer.add_blank_page(EXECUTIVE_WIDTH, EXECUTIVE_HEIGHT)
            numCurrentPage+=1
        if(not makeFromDouble):
            for j in range(nbPages):
                cname = "canvas_{}_tmp.pdf".format(j)
                c = canvas.Canvas(cname, pagesize=A3)
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
                if(read3 != None and numCurrentPage!=0 and not itsTheFirstPage):
                    if(numCurrentPage%2 == 0):
                        page.merge_page(read3.pages[1])
                    else:
                        page.merge_page(read3.pages[0])


                numCurrentPage+=1
                page.mediabox.right = w/2.0+EXECUTIVE_WIDTH/2.0
                page.mediabox.left = w/2.0-EXECUTIVE_WIDTH/2.0
                page.mediabox.top = h/2.0+EXECUTIVE_HEIGHT/2.0
                page.mediabox.bottom = h/2.0-EXECUTIVE_HEIGHT/2.0
                writer.add_page(page)

                if(itsTheFirstPage):
                    itsTheFirstPage = False
                os.remove(cname)
        else:
            for k in range(nbPages):
                cname = "canvas_{}_juxta.pdf".format(k)
                c = canvas.Canvas(cname, pagesize=landscape(A3))
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
                if(read3 != None):
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

                writer.add_page(pageL)
                writer.add_page(pageR)

                os.remove(cname)

    with open("pages_cropped_FINAL.pdf", "wb") as fp:
        writer.write(fp)
        print("pages_cropped_FINAL.pdf succesfully created!")

    print("{} pages!".format(len(writer.pages)))


def create_page_num(page, num, double=False, textFont="GentiumBookPlus-Regular", textSize=9):
    cname = "canvas_{}_tmp.pdf".format(num)
    c = canvas.Canvas(cname, pagesize=A3)

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
    writer.add_blank_page(EXECUTIVE_WIDTH, EXECUTIVE_HEIGHT)
    writer.add_blank_page(EXECUTIVE_WIDTH, EXECUTIVE_HEIGHT)
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
            writer.add_blank_page(EXECUTIVE_WIDTH, EXECUTIVE_HEIGHT)
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
                    w/2.0-EXECUTIVE_WIDTH/2.0,
                    w/2.0+EXECUTIVE_WIDTH/2.0,
                    h/2.0+EXECUTIVE_HEIGHT/2.0,
                    h/2.0-EXECUTIVE_HEIGHT/2.0
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

    with open("pages_cropped_FINAL.pdf", "wb") as fp:
        writer.write(fp)

    print("{} pages!".format(len(writer.pages)))


def vertical():
    doc=args[1]
    reader = PdfReader("{}".format(doc))
    writer = PdfWriter()
    nbPages = len(reader.pages)
    for i in range(nbPages):
        cname = "canvas_{}_tmp.pdf".format(i)
        c = canvas.Canvas(cname, pagesize=A3)
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

        page.mediabox.right = w/2.0+EXECUTIVE_WIDTH/2.0
        page.mediabox.left = w/2.0-EXECUTIVE_WIDTH/2.0
        page.mediabox.top = h/2.0+EXECUTIVE_HEIGHT/2.0
        page.mediabox.bottom = h/2.0-EXECUTIVE_HEIGHT/2.0
        writer.add_page(page)

        os.remove(cname)

    with open("pages_cropped_{}".format(doc), "wb") as fp:
        writer.write(fp)


def juxta():
    cname = "canvas_{}_tmp.pdf".format(1)
    c = canvas.Canvas(cname, pagesize=landscape(A3))
    readerL = PdfReader("{}".format(args[1]))
    readerR = PdfReader("{}".format(args[1]))
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
    name=args[1]
    # start=int(args[2])
    # range=int(args[3])

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


def reduce_pdf():
    name=args[1]
    reader = PdfReader(name)
    writer = PdfWriter()

    for page in reader.pages:
        page.compress_content_streams()  # This is CPU intensive!
        writer.add_page(page)

    writer.add_metadata(reader.metadata)

    with open("compressed_{}".format(name), "wb") as f:
        writer.write(f)

if __name__ == "__main__":
    if(os.path.exists("../static/html/newDir/pdf/manifest.json")):
        source_folder = "../static/html/newDir/pdf/"
        destination_folder = "./"

        # fetch all files
        for file_name in os.listdir(source_folder):
            # construct full file path
            source = source_folder + file_name
            destination = destination_folder + file_name
            # copy only files
            if os.path.isfile(source) and "cv.json" not in file_name:
                shutil.copy(source, destination)
                print('copied', file_name)
        print("running...")
        OLD_solving_all_the_problems_in_the_world_at_the_same_time()

        listFiles = os.listdir('./')
        for name in listFiles:
            if((".pdf" in name and "FINAL" not in name) or name == "manifest.json"):
                [fn, ext] = name.split(".")
                os.remove(name)
        print("Directory cleaned!")