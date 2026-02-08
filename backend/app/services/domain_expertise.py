"""
Domain-Specific Clinical Expertise
===================================
Deep clinical knowledge per signal category.
Injected into AI prompts for better signal analysis and chatbot responses.

Each category provides:
- interpretation_framework: Step-by-step approach for reading the signal
- key_findings: What patterns and features to look for
- normal_values: Reference ranges and normal parameters
- common_pathologies: Diseases/conditions detectable from the signal
"""

# =============================================================================
# CARDIAC (ECG)
# =============================================================================

CARDIAC_EXPERTISE = {
    "domain": "Cardiac Electrophysiology",
    "signal_type": "ECG / EKG",
    "interpretation_framework": """
ECG Systematic Interpretation (use this order):
1. RATE: Count R-R intervals. Normal 60-100 bpm. <60 = bradycardia, >100 = tachycardia.
2. RHYTHM: Regular vs irregular. Look for consistent P-P and R-R intervals.
3. P WAVES: Present before each QRS? Morphology consistent? Upright in Lead II?
4. PR INTERVAL: Normal 0.12-0.20s (3-5 small boxes). Prolonged = AV block.
5. QRS COMPLEX: Normal <0.12s (3 small boxes). Wide = bundle branch block or ventricular origin.
6. ST SEGMENT: Isoelectric (flat)? Elevation = acute injury/MI. Depression = ischemia.
7. T WAVES: Normally upright in I, II, V4-V6. Inverted T waves suggest ischemia or strain.
8. QT INTERVAL: Corrected QTc normal <0.44s (men), <0.46s (women).
""",
    "key_findings": [
        "P wave morphology and axis (absent P = AF, sawtooth = flutter, peaked = RAE, notched = LAE)",
        "PR interval prolongation or variability (1st/2nd/3rd degree AV blocks)",
        "QRS width and morphology (RBBB: RSR' in V1, LBBB: broad notched R in V5-V6)",
        "ST elevation/depression pattern and distribution (territorial = coronary artery)",
        "T wave inversions (symmetric deep = ischemia, asymmetric = strain/LVH)",
        "Q waves (pathological if >1mm wide, >25% of R wave height = old MI)",
        "Rhythm irregularity patterns (regularly irregular vs irregularly irregular)",
        "Axis deviation (normal -30 to +90, LAD, RAD)",
        "Voltage criteria for chamber enlargement (LVH: S in V1 + R in V5 > 35mm)",
    ],
    "normal_values": {
        "heart_rate": "60-100 bpm",
        "pr_interval": "0.12-0.20 seconds",
        "qrs_duration": "<0.12 seconds",
        "qt_interval": "QTc <0.44s (male), <0.46s (female)",
        "p_wave_duration": "<0.12 seconds",
        "p_wave_amplitude": "<2.5mm",
        "axis": "-30 to +90 degrees",
        "paper_speed": "25 mm/s standard",
        "voltage_calibration": "10 mm/mV standard",
    },
    "common_pathologies": [
        "Atrial Fibrillation (AF): Irregular R-R, no organized P waves, fibrillatory baseline",
        "Atrial Flutter: Sawtooth F waves at ~300/min, often 2:1 block giving 150 bpm rate",
        "Myocardial Infarction: ST elevation in territorial leads, reciprocal depression",
        "Left Bundle Branch Block: Wide QRS >0.12s, broad notched R in V5-V6, no septal Q",
        "Right Bundle Branch Block: Wide QRS >0.12s, RSR' in V1, deep S in V5-V6",
        "Ventricular Tachycardia: Wide complex tachycardia, AV dissociation, capture/fusion beats",
        "AV Blocks: 1st degree (prolonged PR), 2nd degree (dropped QRS), 3rd degree (complete dissociation)",
        "Left Ventricular Hypertrophy: Voltage criteria + strain pattern (ST depression, T inversion in lateral leads)",
        "Pericarditis: Diffuse ST elevation, PR depression, no reciprocal changes",
        "Wolff-Parkinson-White: Short PR, delta wave, wide QRS",
    ],
}

# =============================================================================
# NEUROLOGICAL (EEG)
# =============================================================================

NEURO_EXPERTISE = {
    "domain": "Clinical Neurophysiology",
    "signal_type": "EEG",
    "interpretation_framework": """
EEG Systematic Interpretation (use this order):
1. BACKGROUND ACTIVITY: Identify dominant posterior rhythm. Normal adult = 8-13 Hz alpha over occipital regions.
2. SYMMETRY: Compare homologous channels (left vs right). Asymmetry suggests focal pathology.
3. CONTINUITY: Continuous vs burst-suppression vs discontinuous. Indicates level of encephalopathy.
4. REACTIVITY: Does the EEG change with eye opening/stimulation? Loss of reactivity = poor prognosis.
5. FREQUENCY CONTENT: Dominant frequencies. Excessive slow activity (delta/theta) = dysfunction.
6. EPILEPTIFORM DISCHARGES: Spikes, sharp waves, spike-and-wave complexes. Focal vs generalized.
7. ARTIFACTS: Eye blinks (frontal), muscle (temporal), movement, electrode. Distinguish from brain activity.
8. SPECIAL PATTERNS: Periodic discharges, triphasic waves, burst-suppression, alpha coma.
""",
    "key_findings": [
        "Posterior dominant rhythm frequency and reactivity (slowed = encephalopathy)",
        "Focal slowing (delta/theta in one region = structural lesion or post-ictal)",
        "Generalized slowing (diffuse theta/delta = metabolic/toxic encephalopathy)",
        "Epileptiform discharges: spikes (<70ms), sharp waves (70-200ms)",
        "Spike-and-wave patterns (3Hz = absence epilepsy, slow spike-wave = Lennox-Gastaut)",
        "Periodic patterns (lateralized = LPDs/PLEDs suggesting acute injury, generalized = GPDs)",
        "Electrographic seizures (evolving rhythmic activity with spatial and frequency evolution)",
        "Breach rhythm (increased amplitude over skull defect, not pathological)",
        "Sleep architecture (vertex waves, spindles, K-complexes if sleep recording)",
        "Phase reversals to localize epileptiform foci (negative phase reversal at maximum)",
    ],
    "normal_values": {
        "posterior_dominant_rhythm": "8-13 Hz (alpha) in adults, attenuates with eye opening",
        "amplitude": "20-100 microvolts typical",
        "delta_band": "0.5-4 Hz (abnormal if prominent in awake adult)",
        "theta_band": "4-8 Hz (mild excess = drowsiness, significant = dysfunction)",
        "alpha_band": "8-13 Hz (normal posterior dominant rhythm)",
        "beta_band": "13-30 Hz (may be enhanced by medications like benzodiazepines)",
        "gamma_band": ">30 Hz (cognitive processing, often obscured by muscle artifact)",
        "standard_montage": "10-20 system, bipolar or referential",
        "display_speed": "30 mm/s standard",
        "sensitivity": "7 microvolts/mm typical",
    },
    "common_pathologies": [
        "Generalized Tonic-Clonic Seizure: Rhythmic spike/polyspike activity evolving in frequency",
        "Absence Seizure: 3 Hz generalized spike-and-wave, abrupt onset and offset",
        "Focal Seizure: Localized rhythmic activity with evolution in frequency, amplitude, distribution",
        "Status Epilepticus: Continuous or near-continuous seizure activity >5 minutes",
        "Encephalopathy (metabolic/toxic): Diffuse slowing, often with triphasic waves",
        "Herpes Encephalitis: Periodic lateralized discharges (PLEDs) in temporal regions",
        "Creutzfeldt-Jakob Disease: Periodic sharp wave complexes at ~1 Hz, generalized",
        "Brain Death: Electrocerebral inactivity (no activity >2 microvolts)",
        "Non-Convulsive Status Epilepticus: Continuous epileptiform patterns without clinical convulsions",
        "Focal Structural Lesion: Persistent focal polymorphic delta activity (FPDA)",
    ],
}

# =============================================================================
# HEMODYNAMIC (ABP / Blood Pressure)
# =============================================================================

HEMODYNAMIC_EXPERTISE = {
    "domain": "Critical Care Hemodynamics",
    "signal_type": "Arterial Blood Pressure (ABP)",
    "interpretation_framework": """
Arterial Waveform Systematic Interpretation:
1. SYSTOLIC UPSTROKE: Sharp rise = normal LV function. Slow rise = aortic stenosis or low output.
2. SYSTOLIC PEAK: Absolute value. Normal 90-140 mmHg. Overshoot = hyperdynamic state.
3. DICROTIC NOTCH: Marks aortic valve closure. Absent = low SVR (sepsis). High = high SVR.
4. DIASTOLIC RUNOFF: Gradual decline. Steep drop = low SVR. Flat = high SVR.
5. DIASTOLIC PRESSURE: Normal 60-90 mmHg. Wide pulse pressure (>40) or narrow (<25).
6. MEAN ARTERIAL PRESSURE: MAP = DBP + 1/3(SBP - DBP). Target >65 mmHg for organ perfusion.
7. WAVEFORM MORPHOLOGY: Respiratory variation, beat-to-beat variability, damping assessment.
8. PULSE PRESSURE VARIATION: >13% suggests fluid responsiveness in mechanically ventilated patients.
""",
    "key_findings": [
        "Systolic upstroke slope (slow = aortic stenosis or poor contractility)",
        "Pulse pressure (SBP-DBP): wide = aortic regurgitation, sepsis; narrow = cardiogenic shock, tamponade",
        "Dicrotic notch position and presence (absent in vasodilation/sepsis)",
        "Respiratory variation (pulsus paradoxus >10mmHg = tamponade, severe asthma)",
        "Pulse pressure variation (PPV >13% = volume responsive in ventilated patients)",
        "Beat-to-beat regularity (irregular = arrhythmia, alternans = severe LV dysfunction)",
        "Waveform damping (overdamped = underestimates systolic, underdamped = overestimates)",
        "Mean arterial pressure trend (MAP <65 = risk of organ hypoperfusion)",
        "Systolic pressure variation with respiration (correlates with fluid status)",
    ],
    "normal_values": {
        "systolic_bp": "90-140 mmHg",
        "diastolic_bp": "60-90 mmHg",
        "mean_arterial_pressure": "70-105 mmHg (target >65 in critical care)",
        "pulse_pressure": "30-50 mmHg",
        "heart_rate": "60-100 bpm",
        "pulse_pressure_variation": "<13% (>13% suggests fluid responsiveness)",
        "systolic_pressure_variation": "<10 mmHg",
    },
    "common_pathologies": [
        "Hypertensive Crisis: SBP >180 or DBP >120, may show steep upstroke and high amplitude",
        "Septic Shock: Low MAP, wide pulse pressure, absent dicrotic notch, high PPV",
        "Cardiogenic Shock: Low systolic with narrow pulse pressure, pulsus alternans possible",
        "Cardiac Tamponade: Pulsus paradoxus >10mmHg, narrow pulse pressure",
        "Aortic Stenosis: Slow upstroke (pulsus tardus), low amplitude (pulsus parvus), late peak",
        "Aortic Regurgitation: Wide pulse pressure, rapid upstroke, rapid diastolic runoff, bisferiens pulse",
        "Hypovolemia: Low amplitude, high PPV, respiratory variation",
        "Intra-Aortic Balloon Pump: Characteristic augmented diastolic waveform pattern",
    ],
}

# =============================================================================
# RESPIRATION (SpO2 / Respiratory waveforms)
# =============================================================================

RESPIRATION_EXPERTISE = {
    "domain": "Pulmonology & Respiratory Monitoring",
    "signal_type": "Respiratory / SpO2 / PPG",
    "interpretation_framework": """
Respiratory Signal Interpretation:
1. RATE: Count breaths per minute. Normal 12-20/min in adults. Tachypnea >20, Bradypnea <12.
2. RHYTHM: Regular vs irregular. Periodic patterns (Cheyne-Stokes, Biot's).
3. DEPTH/AMPLITUDE: Tidal volume correlate. Shallow = restrictive, Deep = metabolic acidosis (Kussmaul).
4. I:E RATIO: Inspiration to expiration ratio. Normal ~1:2. Prolonged E = obstructive disease.
5. SpO2 WAVEFORM: Plethysmographic quality. Good pulsatile signal = reliable reading.
6. SpO2 VALUE: Normal >95%. Desaturation patterns, duration, and nadir.
7. BASELINE: Stable vs drifting. Artifacts from motion.
8. ASSOCIATED PATTERNS: Correlation with heart rate changes (bradycardia with apnea in infants).
""",
    "key_findings": [
        "Respiratory rate and regularity (periodic breathing patterns, apneic episodes)",
        "Apnea duration and frequency (obstructive vs central vs mixed)",
        "Desaturation events (depth, duration, recovery time, associated with apnea?)",
        "Cheyne-Stokes pattern (crescendo-decrescendo breathing with central apneas)",
        "SpO2 baseline and variability (nocturnal desaturations, exercise desaturation)",
        "Plethysmographic waveform quality (perfusion index, pulsatility)",
        "Heart rate variability correlated with respiratory cycle (sinus arrhythmia = normal)",
        "I:E ratio abnormalities (prolonged expiration = COPD/asthma)",
        "Paradoxical breathing (abdominal and thoracic out of phase = diaphragm weakness)",
    ],
    "normal_values": {
        "respiratory_rate": "12-20 breaths/min (adult)",
        "spo2": ">95% (>90% acceptable in COPD)",
        "ie_ratio": "~1:2 (inspiration shorter than expiration)",
        "tidal_volume": "6-8 mL/kg ideal body weight",
        "apnea_threshold": ">10 seconds cessation of airflow",
        "desaturation": ">3% drop from baseline considered significant",
    },
    "common_pathologies": [
        "Obstructive Sleep Apnea: Repetitive desaturations with continued respiratory effort",
        "Central Sleep Apnea: Desaturations with absent respiratory effort",
        "Cheyne-Stokes Respiration: Crescendo-decrescendo pattern with central apneas (heart failure, stroke)",
        "COPD Exacerbation: Baseline SpO2 88-92%, prolonged expiration, tachypnea",
        "Asthma: Prolonged expiratory phase, tachypnea, desaturation during attacks",
        "Pulmonary Embolism: Acute desaturation, tachypnea, tachycardia",
        "Hypoventilation: Gradual desaturation, low respiratory rate, high CO2",
        "Kussmaul Breathing: Deep, rapid breathing (metabolic acidosis, DKA)",
    ],
}

# =============================================================================
# MOTION (Gait / Accelerometry)
# =============================================================================

MOTION_EXPERTISE = {
    "domain": "Biomechanics & Movement Analysis",
    "signal_type": "Gait / Accelerometry",
    "interpretation_framework": """
Gait & Motion Signal Interpretation:
1. CADENCE: Steps per minute. Normal ~100-120 steps/min. Reduced in neurodegenerative disease.
2. STRIDE LENGTH: Distance between successive heel strikes of same foot. Reduced = shuffling.
3. STRIDE TIME: Duration of one gait cycle. Increased variability = fall risk.
4. SYMMETRY: Compare left vs right. Asymmetry = unilateral pathology (hemiparesis, pain).
5. SWING/STANCE RATIO: Normal ~40%/60%. Increased stance = instability, pain avoidance.
6. ACCELERATION PATTERN: Smooth sinusoidal = normal. Jerky/irregular = ataxia or rigidity.
7. STRIDE-TO-STRIDE VARIABILITY: Low variability = healthy. High variability = neurodegenerative disease, fall risk.
8. FREQUENCY CONTENT: Dominant frequencies reflect gait pattern. Tremor at 4-6 Hz (Parkinson's).
""",
    "key_findings": [
        "Cadence reduction (decreased steps/min in Parkinson's, cautious gait)",
        "Stride time variability (coefficient of variation >3-4% = pathological)",
        "Asymmetry index (left-right differences in timing or force)",
        "Freezing episodes (sudden cessation of movement, characteristic of Parkinson's)",
        "Festination (progressively shorter, faster steps in Parkinson's)",
        "Ataxic pattern (wide base, irregular timing and amplitude)",
        "Spastic pattern (stiff, circumduction, reduced velocity)",
        "Tremor frequency and amplitude (resting ~4-6 Hz = Parkinson's, intention = cerebellar)",
        "Double support time (increased = instability, reduced = running/hurrying)",
    ],
    "normal_values": {
        "cadence": "100-120 steps/min",
        "stride_length": "1.2-1.5 meters",
        "gait_speed": "1.0-1.4 m/s",
        "stride_time_variability": "CV <3-4%",
        "swing_stance_ratio": "40/60%",
        "double_support_time": "~10% of gait cycle",
        "step_symmetry": "Ratio close to 1.0",
    },
    "common_pathologies": [
        "Parkinson's Disease: Reduced cadence, short shuffling steps, festination, freezing, resting tremor",
        "Huntington's Disease: Choreiform movements, irregular stride timing, wide base",
        "ALS: Progressive weakness pattern, foot drop, reduced stride length",
        "Cerebellar Ataxia: Wide base, irregular timing, intention tremor, dysmetria",
        "Hemiparetic Gait: Asymmetric timing, circumduction, reduced swing on affected side",
        "Peripheral Neuropathy: Steppage gait (high stepping to compensate for foot drop)",
        "Normal Pressure Hydrocephalus: Magnetic gait (feet stuck to floor), wide base, short steps",
    ],
}


# =============================================================================
# LOOKUP AND FORMATTING
# =============================================================================

EXPERTISE_BY_CATEGORY = {
    "Cardiac": CARDIAC_EXPERTISE,
    "cardiac": CARDIAC_EXPERTISE,
    "Neuro": NEURO_EXPERTISE,
    "neuro": NEURO_EXPERTISE,
    "neurological": NEURO_EXPERTISE,
    "Neurological": NEURO_EXPERTISE,
    "Hemodynamic": HEMODYNAMIC_EXPERTISE,
    "hemodynamic": HEMODYNAMIC_EXPERTISE,
    "Respiration": RESPIRATION_EXPERTISE,
    "respiration": RESPIRATION_EXPERTISE,
    "Motion": MOTION_EXPERTISE,
    "motion": MOTION_EXPERTISE,
}


def get_expertise(signal_type: str) -> dict | None:
    """Get the expertise dict for a signal type. Returns None if not found."""
    return EXPERTISE_BY_CATEGORY.get(signal_type)


def format_expertise_for_analysis(signal_type: str) -> str:
    """
    Build a clinical knowledge block for signal analysis prompts.
    Returns a formatted string to inject into the AI prompt.
    """
    expertise = get_expertise(signal_type)
    if not expertise:
        return ""

    parts = [
        f"## Clinical Reference: {expertise['domain']} ({expertise['signal_type']})",
        "",
        expertise["interpretation_framework"].strip(),
        "",
        "### Key Diagnostic Features:",
    ]
    for finding in expertise["key_findings"]:
        parts.append(f"- {finding}")

    parts.append("")
    parts.append("### Normal Reference Values:")
    for key, val in expertise["normal_values"].items():
        parts.append(f"- {key.replace('_', ' ').title()}: {val}")

    parts.append("")
    parts.append("### Common Pathologies to Consider:")
    for path in expertise["common_pathologies"]:
        parts.append(f"- {path}")

    return "\n".join(parts)


def format_expertise_for_chat(signal_type: str) -> str:
    """
    Build a shorter clinical knowledge block for chatbot context.
    Less verbose than analysis, focused on what the user might ask about.
    """
    expertise = get_expertise(signal_type)
    if not expertise:
        return ""

    parts = [
        f"## Active Signal Domain: {expertise['domain']} ({expertise['signal_type']})",
        "",
        "### Interpretation Approach:",
        expertise["interpretation_framework"].strip(),
        "",
        "### Normal Values:",
    ]
    for key, val in expertise["normal_values"].items():
        parts.append(f"- {key.replace('_', ' ').title()}: {val}")

    parts.append("")
    parts.append("### Recognizable Pathologies:")
    for path in expertise["common_pathologies"][:6]:  # Top 6 for brevity
        parts.append(f"- {path}")

    return "\n".join(parts)
