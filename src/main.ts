import "./style.css";
import "./wakelock";
import * as THREE from "three";
import { GUI } from "lil-gui";
import { setupUi } from "./ui";
import type { Microphone } from "./microphone";
import { FFT_SIZE } from "./constants";

let microphone: Microphone | null = null;
