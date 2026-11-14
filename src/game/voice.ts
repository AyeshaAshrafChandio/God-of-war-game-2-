import { gameAudio } from './audio';

export type VoiceRole = 'hero' | 'oracle' | 'boss';

class VoiceActingManager {
  private voiceVolume = 0.9;
  private isSpeaking = false;

  public setVolume(vol: number) {
    this.voiceVolume = Math.max(0, Math.min(1, vol));
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public speakLine(text: string, role: VoiceRole) {
    this.stop();
    if (this.voiceVolume <= 0.02) return;

    this.isSpeaking = true;
    // Play subtle dramatic vocal cadence resonance in Web Audio so every environment hears expressive tone
    gameAudio.playVoiceCadence(role, this.voiceVolume);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const utter = new SpeechSynthesisUtterance(text);
        utter.volume = this.voiceVolume;
        if (role === 'hero') {
          utter.pitch = 0.62; // Deep Spartan warrior baritone
          utter.rate = 0.88;
        } else if (role === 'oracle') {
          utter.pitch = 1.15; // Ethereal Olympian oracle
          utter.rate = 0.92;
        } else {
          utter.pitch = 0.42; // Colossal Titan rumble
          utter.rate = 0.78;
        }
        utter.onend = () => {
          this.isSpeaking = false;
        };
        utter.onerror = () => {
          this.isSpeaking = false;
        };
        window.speechSynthesis.speak(utter);
      } catch {
        this.isSpeaking = false;
      }
    }
  }

  public stop() {
    this.isSpeaking = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore TTS cancel errors
      }
    }
  }
}

export const voiceActing = new VoiceActingManager();
