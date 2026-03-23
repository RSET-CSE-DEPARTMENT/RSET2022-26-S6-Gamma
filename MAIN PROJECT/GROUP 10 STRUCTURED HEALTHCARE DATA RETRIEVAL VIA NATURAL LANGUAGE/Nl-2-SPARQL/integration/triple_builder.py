from rdflib import Literal
from rdflib.namespace import RDF, XSD
from .schema import EX, new_graph
from .utils import *

def build_vital_triples(data):

    g = new_graph()

    obs_id = f"OBS{data['patient_id']}_{data['stay_id']}_{data['timestamp']}"

    obs = EX[obs_id]
    stay = EX[data['stay_id']]

    g.add((obs, RDF.type, EX.VitalObservation))
    g.add((stay, EX.hasVitalAt, obs))

    g.add((obs, EX.timestamp, Literal(data["timestamp"], datatype=XSD.dateTime)))
    g.add((obs, EX.systolicBP, Literal(data["systolicBP"], datatype=XSD.integer)))
    g.add((obs, EX.diastolicBP, Literal(data["diastolicBP"], datatype=XSD.integer)))
    g.add((obs, EX.heartRate, Literal(data["heartRate"], datatype=XSD.integer)))
    g.add((obs, EX.respiratoryRate, Literal(data["respiratoryRate"], datatype=XSD.integer)))
    g.add((obs, EX.temperature, Literal(data["temperature"], datatype=XSD.float)))
    g.add((obs, EX.spO2, Literal(data["spO2"], datatype=XSD.integer)))

    return g


def build_stay_triples(data):

    g = new_graph()

    stay = EX[f"{data['stay_id']}"]
    patient = EX[f"P{data['patient_id']}"]

    g.add((stay, RDF.type, EX.HospitalStay))
    g.add((patient, EX.hasStay, stay))

    g.add((stay, EX.admissionTime, Literal(data["admissionTime"], datatype=XSD.dateTime)))
    g.add((stay, EX.dischargeTime, Literal(data["dischargeTime"], datatype=XSD.dateTime)))
    g.add((stay, EX.lengthOfStayHours, Literal(data["lengthOfStayHours"], datatype=XSD.integer)))
    g.add((stay, EX.glucose, Literal(data["glucose"], datatype=XSD.float)))
    g.add((stay, EX.cholesterol, Literal(data["cholesterol"], datatype=XSD.float)))
    g.add((stay, EX.creatinine, Literal(data["creatinine"], datatype=XSD.float)))

    return g
