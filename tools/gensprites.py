# CLI shell for AudioSprite library
#
# Usage: gensprites.py -n name [-f source [-v volume]]+
# Output: path to generated zip file
import argparse
import sys
import os
import tempfile
import zipfile
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/../audiosprite')
from audiosprite import AudioSprite

# Function for zipping files.  If keep is true, the folder, along with 
#  all its contents, will be written to the zip file.  If false, only 
#  the contents of the input folder will be written to the zip file - 
#  the input folder name will not appear in the zip file.
#
def zipws(path, zip, keep):
    path = os.path.normpath(path)
    # os.walk visits every subdirectory, returning a 3-tuple
    #  of directory name, subdirectories in it, and file names
    #  in it.
    #
    for (dirpath, dirnames, filenames) in os.walk(path):
        # Iterate over every file name
        #
        for file in filenames:
            # Ignore .lock files
            #
            if not file.endswith('.lock'):
                print "Adding %s..." % os.path.join(path, dirpath, file)
                try:
                    if keep:
                        zip.write(os.path.join(dirpath, file),
                        os.path.join(os.path.basename(path), os.path.join(dirpath, file)[len(path)+len(os.sep):]))
                    else:
                        zip.write(os.path.join(dirpath, file),            
                        os.path.join(dirpath[len(path):], file)) 
                        
                except Exception, e:
                    print "Error adding %s: %s" % (file, e)

    return None


def compress(outfile, dirname):
    try:
        zip = zipfile.ZipFile(outfile, 'w', zipfile.ZIP_DEFLATED)
        zipws(dirname, zip, True)
        zip.close()
    except RuntimeError:
        # Delete zip file if it exists
        #
        if os.path.exists(outfile):
            os.unlink(outfile)
        zip = zipfile.ZipFile(outfile, 'w', zipfile.ZIP_STORED)
        zipws(infolder, zip, True)
        zip.close()

    return True

def generate(name, outfile, files=[], volumes=[]):

    #print 'id: ' + name
    #print files
    #print volumes
    sprite = AudioSprite(name)

    for idx in range(0, len(files)):
        sprite.addAudio(files[idx], volume=volumes[idx])

    outdir = tempfile.mkdtemp(suffix=name)
    print 'zipping ' + outdir + '  to ' + outfile

    return sprite.save(outdir, name) and compress(outfile, outdir)

def main():

    parser = argparse.ArgumentParser(description='Generate audio sprite files')

    parser.add_argument('name', help='sprite id')
    parser.add_argument('-o', '--outfile', help='output zip file')
    parser.add_argument('-f', '--file', nargs='+', help='source file paths')
    parser.add_argument('-v', '--volume', type=int, nargs='+', help='source file volumes')
    args = parser.parse_args()

    generate(args.name, args.outfile, files=args.file, volumes=args.volume)
    return 0
    
if __name__ == "__main__":
    try:
        retVal = main()
        sys.exit(retVal)
    except Exception as err:
        print err
        sys.exit(1)
