from pydub import AudioSegment
import string

def run(audio_file):
    seg = AudioSegment.from_file(audio_file)
    print ','.join(map(str, [seg.rms, seg.max, seg.max_possible_amplitude]))
    
if __name__ == "__main__":
    import sys
    run(sys.argv[1])
