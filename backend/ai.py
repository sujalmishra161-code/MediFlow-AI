import os
import json
import re

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

# Allowed specialties from doctors.csv
ALLOWED_SPECIALTIES = [
    'Anaesthesiology', 'Cardiology', 'Dermatology', 'ENT', 'Forensic Medicine',
    'General Medicine', 'General Surgery', 'Microbiology', 'Neurology',
    'Obstetrics & Gynaecology', 'Ophthalmology', 'Orthopaedics', 'Paediatric Surgery',
    'Paediatrics', 'Pathology', 'Pharmacology', 'Pulmonology', 'Radiology',
    'Radiology/Imaging', 'Surgical Oncology'
]

def classify_symptoms_gemini(symptoms: str) -> dict | None:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not HAS_GEMINI:
        return None

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        You are a medical specialty and priority triage classifier.
        Analyze the patient symptoms or reason for visit: "{symptoms}"

        Instructions:
        1. Classify the patient's symptoms into EXACTLY ONE of these allowed specialties:
           {ALLOWED_SPECIALTIES}
        2. Assign an urgency priority from: ["LOW", "MEDIUM", "HIGH", "EMERGENCY"]
        3. Estimate your classification confidence (a float between 0.0 and 1.0).
        4. CRITICAL: DO NOT return a diagnosis, prescription, or treatment plan. Keep the description general.

        Output format MUST be raw structured JSON only:
        {{
          "specialty": "Specialty Name",
          "urgency": "URGENCY_LEVEL",
          "confidence": 0.95
        }}
        """
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Parse JSON block from output
        json_match = re.search(r"\{.*\}", text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
            # Validate specialty
            spec = data.get("specialty")
            # Find closest match if not exact
            for allowed in ALLOWED_SPECIALTIES:
                if allowed.lower() == spec.lower():
                    data["specialty"] = allowed
                    return data
    except Exception as e:
        print(f"Gemini API classification failed: {e}. Falling back to local NLP.")
    return None


def classify_symptoms_local(symptoms: str) -> dict:
    s = symptoms.lower()

    # Predefined demo scenario 1
    if "chest pain" in s and "breathing difficulty" in s:
        return {"specialty": "Cardiology", "urgency": "HIGH", "confidence": 0.91}
    if "chest pain" in s:
        return {"specialty": "Cardiology", "urgency": "HIGH", "confidence": 0.95}

    # Cardiology
    if any(k in s for k in ["heart", "cardio", "palpitation", "chest tightness"]):
        return {"specialty": "Cardiology", "urgency": "HIGH", "confidence": 0.92}

    # Neurology
    if any(k in s for k in ["headache", "migraine", "seizure", "numb", "paralysis", "stroke", "brain", "dizzy"]):
        urgency = "HIGH" if any(k in s for k in ["stroke", "paralysis", "seizure"]) else "MEDIUM"
        return {"specialty": "Neurology", "urgency": urgency, "confidence": 0.90}

    # Pulmonology
    if any(k in s for k in ["cough", "lung", "pulmonary", "asthma", "breathless", "wheezing", "pneumonia"]):
        urgency = "HIGH" if "breathless" in s else "MEDIUM"
        return {"specialty": "Pulmonology", "urgency": urgency, "confidence": 0.89}

    # Dermatology
    if any(k in s for k in ["skin", "rash", "acne", "itching", "eczema", "spots", "dermatitis", "allergy"]):
        return {"specialty": "Dermatology", "urgency": "LOW", "confidence": 0.93}

    # ENT
    if any(k in s for k in ["ear", "throat", "hearing", "sinus", "nose", "tonsil", "ent"]):
        return {"specialty": "ENT", "urgency": "LOW", "confidence": 0.88}

    # Obstetrics & Gynaecology
    if any(k in s for k in ["pregnant", "pregnancy", "menstrual", "period", "gyne", "obstetrics", "gynaecology", "uterus", "delivery"]):
        return {"specialty": "Obstetrics & Gynaecology", "urgency": "MEDIUM", "confidence": 0.91}

    # Paediatrics
    if any(k in s for k in ["baby", "child", "infant", "pediatric", "paediatric", "vaccination"]):
        return {"specialty": "Paediatrics", "urgency": "MEDIUM", "confidence": 0.90}

    # Orthopaedics
    if any(k in s for k in ["fracture", "bone", "joint", "knee", "back pain", "sprain", "ortho"]):
        urgency = "HIGH" if "fracture" in s else "MEDIUM"
        return {"specialty": "Orthopaedics", "urgency": urgency, "confidence": 0.94}

    # Ophthalmology
    if any(k in s for k in ["eye", "vision", "cataract", "blurry", "ophthalm"]):
        return {"specialty": "Ophthalmology", "urgency": "LOW", "confidence": 0.92}

    # General Surgery
    if any(k in s for k in ["surgery", "appendic", "hernia", "gallbladder", "tumor", "cyst"]):
        return {"specialty": "General Surgery", "urgency": "HIGH", "confidence": 0.88}

    # General Medicine / common ailments
    if any(k in s for k in ["fever", "cold", "body ache", "flu", "weakness", "vomit", "stomach", "diarrhea", "pain"]):
        urgency = "MEDIUM" if any(k in s for k in ["vomit", "diarrhea", "severe"]) else "LOW"
        return {"specialty": "General Medicine", "urgency": urgency, "confidence": 0.90}

    # Catch-all fallback
    return {"specialty": "General Medicine", "urgency": "LOW", "confidence": 0.70}


def classify_symptoms(symptoms: str) -> dict:
    """
    Classify symptoms using Gemini API (if key present) or local NLP fallback.
    """
    result = classify_symptoms_gemini(symptoms)
    if result:
        return result
    return classify_symptoms_local(symptoms)
