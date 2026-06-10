import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type AudioPlayer,
} from 'expo-audio'
import * as FileSystem from 'expo-file-system/legacy'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import * as Speech from 'expo-speech'
import * as SQLite from 'expo-sqlite'
import {
  AudioLines,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  FolderOpen,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  Mic,
  Moon,
  Pause,
  Play,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  Sun,
  Trash2,
  X,
} from 'lucide-react-native'
import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image as RNImage,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context'
import * as SystemUI from 'expo-system-ui'
import { SystemBars } from 'react-native-edge-to-edge'
import DateTimePicker from '@react-native-community/datetimepicker'

type Tab = 'home' | 'calendar' | 'projects' | 'assistant' | 'settings'
type ThemeName = 'dark' | 'light'
type Priority = 'Alta' | 'Media' | 'Baja'
type FontScale = 1 | 1.15 | 1.3

type Task = {
  id: string
  title: string
  description: string
  course: string
  date: string
  time: string
  priority: Priority
  done: boolean
  reminder: boolean
  imageUri: string | null
  audioUri: string | null
  createdAt: string
}

type TaskRow = Omit<Task, 'done' | 'reminder'> & {
  done: number
  reminder: number
}

type SubjectRow = Subject
type ProjectRow = Project

type TaskDraft = Omit<Task, 'id' | 'done' | 'createdAt'>

type AssistantResult = {
  answer: string
  taskDraft?: TaskDraft
}

type Project = {
  id: string
  title: string
  course: string
  due: string
  description: string
  progress: number
  accent: string
  createdAt: string
}

type ProjectSubtask = {
  id: string
  projectId: string
  title: string
  done: boolean
  createdAt: string
}

type ProjectSubtaskRow = Omit<ProjectSubtask, 'done'> & {
  done: number
}

type Subject = {
  id: string
  name: string
  createdAt: string
}

type ProjectDraft = Omit<Project, 'id' | 'createdAt'>
type ProjectSubtaskDraft = Omit<ProjectSubtask, 'id' | 'createdAt'>

type Theme = {
  name: ThemeName
  bg: string
  card: string
  surface: string
  surfaceStrong: string
  text: string
  muted: string
  soft: string
  border: string
  accent: string
  accentSoft: string
  tab: string
}

const themes: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    bg: '#050608',
    card: 'rgba(26, 28, 31, 0.86)',
    surface: 'rgba(255,255,255,0.055)',
    surfaceStrong: 'rgba(255,255,255,0.09)',
    text: '#f6f7fb',
    muted: '#9da0ab',
    soft: '#727783',
    border: 'rgba(255,255,255,0.13)',
    accent: '#39bfd1',
    accentSoft: 'rgba(57,191,209,0.16)',
    tab: 'rgba(5,6,8,0.94)',
  },
  light: {
    name: 'light',
    bg: '#f7f8fb',
    card: 'rgba(255,255,255,0.94)',
    surface: 'rgba(255,255,255,0.72)',
    surfaceStrong: 'rgba(255,255,255,0.96)',
    text: '#11141a',
    muted: '#666b78',
    soft: '#858b98',
    border: 'rgba(16,24,40,0.12)',
    accent: '#1c93ad',
    accentSoft: 'rgba(28,147,173,0.14)',
    tab: 'rgba(247,248,251,0.96)',
  },
}

const starterSubjectNames = [
  'Gestión de Proyectos',
  'Base de Datos',
  'Interacción Humano-Computador',
  'Investigación',
  'Matemáticas',
]

const weekLabels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

const projectAccents = ['#5dd6cf', '#8bb7ff', '#f2bf65', '#63d8ad', '#ff7a8a', '#b8a7ff']

const starterSubjects = (): Subject[] =>
  starterSubjectNames.map((name) => ({
    id: makeId(),
    name,
    createdAt: new Date().toISOString(),
  }))

const starterProjects = (): Project[] => [
  {
    id: 'projectx',
    title: 'ProjectX',
    course: 'Interacción Humano-Computador',
    due: 'Entrega parcial',
    description: 'Prototipo, prueba de usabilidad y entrega documentada para IHC.',
    progress: 72,
    accent: '#5dd6cf',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'capm',
    title: 'Certificación CAPM',
    course: 'Preparación profesional',
    due: 'Simulacro viernes',
    description: 'Plan de práctica con simulacros, lectura PMBOK y revisión de errores.',
    progress: 46,
    accent: '#8bb7ff',
    createdAt: new Date().toISOString(),
  },
]

const starterProjectSubtasks = (): ProjectSubtask[] => [
  {
    id: makeId(),
    projectId: 'projectx',
    title: 'Cerrar alcance y criterios de evaluación',
    done: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: makeId(),
    projectId: 'projectx',
    title: 'Preparar prototipo navegable',
    done: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: makeId(),
    projectId: 'projectx',
    title: 'Documentar hallazgos de la prueba',
    done: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: makeId(),
    projectId: 'capm',
    title: 'Resolver simulacro cronometrado',
    done: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: makeId(),
    projectId: 'capm',
    title: 'Repasar dominios con menor puntaje',
    done: false,
    createdAt: new Date().toISOString(),
  },
]

const dbName = 'academic_hub.db'
const mediaFolder = `${FileSystem.documentDirectory ?? ''}academic-hub-media/`
const fontScales: FontScale[] = [1, 1.15, 1.3]

const formatIso = (date: Date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const validateDateTime = (dateStr: string, timeStr: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'La fecha debe tener el formato YYYY-MM-DD. Por ejemplo: 2026-05-20'
  const parsedDate = new Date(dateStr)
  if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().split('T')[0] !== dateStr) return 'La fecha ingresada no existe en el calendario.'
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr)) return 'La hora debe tener el formato HH:mm (24 horas). Por ejemplo: 14:30'
  return null
}

const offsetDate = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return formatIso(date)
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

const starterTasks = (): Task[] => [
  {
    id: makeId(),
    title: 'Aprobar cronograma de Actívate',
    description: 'Revisar fechas, responsables y entregables antes de enviarlo.',
    course: 'Gestión de Proyectos',
    date: offsetDate(0),
    time: '09:30',
    priority: 'Alta',
    done: false,
    reminder: true,
    imageUri: null,
    audioUri: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: makeId(),
    title: 'Revisar queries en SQL Server',
    description: 'Validar joins, filtros y nombres de columnas para el reporte.',
    course: 'Base de Datos',
    date: offsetDate(0),
    time: '14:00',
    priority: 'Media',
    done: false,
    reminder: true,
    imageUri: null,
    audioUri: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: makeId(),
    title: 'Grabar resumen de metodología',
    description: 'Explicar hallazgos principales de la prueba de usabilidad.',
    course: 'Investigación',
    date: offsetDate(1),
    time: '18:20',
    priority: 'Baja',
    done: false,
    reminder: false,
    imageUri: null,
    audioUri: null,
    createdAt: new Date().toISOString(),
  },
]

const rowToTask = (row: TaskRow): Task => ({
  ...row,
  done: row.done === 1,
  reminder: row.reminder === 1,
})

async function ensureMediaDirectory() {
  if (!FileSystem.documentDirectory) return
  const info = await FileSystem.getInfoAsync(mediaFolder)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(mediaFolder, { intermediates: true })
  }
}

async function copyToAppStorage(uri: string, fallbackExtension: string) {
  if (!FileSystem.documentDirectory) return uri

  await ensureMediaDirectory()
  const cleanUri = uri.split('?')[0]
  const extension = cleanUri.includes('.') ? cleanUri.slice(cleanUri.lastIndexOf('.')) : fallbackExtension
  const target = `${mediaFolder}${makeId()}${extension}`
  await FileSystem.copyAsync({ from: uri, to: target })
  return target
}

async function setupDatabase(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      course TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      priority TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      reminder INTEGER NOT NULL DEFAULT 1,
      imageUri TEXT,
      audioUri TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      course TEXT NOT NULL,
      due TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      progress INTEGER NOT NULL DEFAULT 0,
      accent TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS project_subtasks (
      id TEXT PRIMARY KEY NOT NULL,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
    );
  `)
}

async function loadTasks(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks ORDER BY date ASC, time ASC, createdAt DESC;',
  )
  return rows.map(rowToTask)
}

async function insertTask(db: SQLite.SQLiteDatabase, task: Task) {
  await db.runAsync(
    `INSERT INTO tasks
      (id, title, description, course, date, time, priority, done, reminder, imageUri, audioUri, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    task.id,
    task.title,
    task.description,
    task.course,
    task.date,
    task.time,
    task.priority,
    task.done ? 1 : 0,
    task.reminder ? 1 : 0,
    task.imageUri,
    task.audioUri,
    task.createdAt,
  )
}

async function loadSubjects(db: SQLite.SQLiteDatabase) {
  return db.getAllAsync<SubjectRow>('SELECT * FROM subjects ORDER BY name ASC;')
}

async function insertSubject(db: SQLite.SQLiteDatabase, subject: Subject) {
  await db.runAsync(
    'INSERT OR IGNORE INTO subjects (id, name, createdAt) VALUES (?, ?, ?);',
    subject.id,
    subject.name,
    subject.createdAt,
  )
}

async function loadProjects(db: SQLite.SQLiteDatabase) {
  return db.getAllAsync<ProjectRow>('SELECT * FROM projects ORDER BY createdAt DESC;')
}

async function insertProject(db: SQLite.SQLiteDatabase, project: Project) {
  await db.runAsync(
    `INSERT INTO projects
      (id, title, course, due, description, progress, accent, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    project.id,
    project.title,
    project.course,
    project.due,
    project.description,
    project.progress,
    project.accent,
    project.createdAt,
  )
}

async function updateProjectInDb(db: SQLite.SQLiteDatabase, project: Project) {
  await db.runAsync(
    `UPDATE projects
      SET title = ?, course = ?, due = ?, description = ?, progress = ?, accent = ?
      WHERE id = ?;`,
    project.title,
    project.course,
    project.due,
    project.description,
    project.progress,
    project.accent,
    project.id,
  )
}

async function loadProjectSubtasks(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<ProjectSubtaskRow>(
    'SELECT * FROM project_subtasks ORDER BY done ASC, createdAt ASC;',
  )
  return rows.map((row) => ({ ...row, done: row.done === 1 }))
}

async function insertProjectSubtask(db: SQLite.SQLiteDatabase, subtask: ProjectSubtask) {
  await db.runAsync(
    'INSERT INTO project_subtasks (id, projectId, title, done, createdAt) VALUES (?, ?, ?, ?, ?);',
    subtask.id,
    subtask.projectId,
    subtask.title,
    subtask.done ? 1 : 0,
    subtask.createdAt,
  )
}

async function updateTaskInDb(db: SQLite.SQLiteDatabase, task: Task) {
  await db.runAsync(
    `UPDATE tasks
      SET title = ?, description = ?, course = ?, date = ?, time = ?, priority = ?, done = ?,
          reminder = ?, imageUri = ?, audioUri = ?
      WHERE id = ?;`,
    task.title,
    task.description,
    task.course,
    task.date,
    task.time,
    task.priority,
    task.done ? 1 : 0,
    task.reminder ? 1 : 0,
    task.imageUri,
    task.audioUri,
    task.id,
  )
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getDateFromQuestion(question: string) {
  const normalized = normalizeText(question)
  const today = new Date()

  if (normalized.includes('hoy')) return formatIso(today)
  if (normalized.includes('manana') || normalized.includes('mañana')) return offsetDate(1)

  const targetDay = [
    'domingo',
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
  ].findIndex((day) => normalized.includes(day))

  if (targetDay >= 0) {
    const date = new Date()
    const diff = (targetDay - date.getDay() + 7) % 7
    date.setDate(date.getDate() + diff)
    return formatIso(date)
  }

  const explicitDate = normalized.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  return explicitDate?.[1] ?? null
}

function formatTaskLine(task: Task) {
  return `${task.time} - ${task.title} (${task.course}, ${task.priority})`
}

function getPriorityFromText(normalized: string): Priority {
  if (normalized.includes('alta') || normalized.includes('urgente') || normalized.includes('importante')) {
    return 'Alta'
  }
  if (normalized.includes('baja')) return 'Baja'
  return 'Media'
}

function getTimeFromText(text: string) {
  const match = normalizeText(text).match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/)
  if (!match) return '08:00'
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

function getCourseFromText(normalized: string, subjects: string[]) {
  return subjects.find((item) => normalized.includes(normalizeText(item))) ?? subjects[0] ?? 'General'
}

function cleanTaskTitleFromCommand(question: string) {
  return question
    .replace(/^(crea|crear|agrega|agregar|anade|añade|nueva)\s+(una\s+)?(tarea|actividad|deber)\s*/i, '')
    .replace(/\b(para|el|la)\s+(hoy|manana|mañana|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)\b/gi, '')
    .replace(/\b(a\s+las|a\s+la|hora)\s+([01]?\d|2[0-3])[:h]([0-5]\d)\b/gi, '')
    .replace(/\bprioridad\s+(alta|media|baja)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPlan(tasks: Task[]) {
  const pending = tasks
    .filter((task) => !task.done)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 6)

  if (!pending.length) return 'No tienes pendientes. Buen momento para adelantar lecturas o descansar.'

  return `Plan sugerido:\n${pending
    .map((task, index) => `${index + 1}. ${formatTaskLine(task)} - ${task.date}`)
    .join('\n')}`
}

function summarizeWorkload(tasks: Task[], subjects: string[]) {
  const pending = tasks.filter((task) => !task.done)
  const byCourse = subjects
    .map((course) => {
      const count = pending.filter((task) => task.course === course).length
      return count > 0 ? `${course}: ${count}` : null
    })
    .filter(Boolean)

  if (!pending.length) return 'No hay tareas pendientes registradas.'
  return `Tienes ${pending.length} pendientes. Carga por materia:\n${byCourse.join('\n')}`
}

function runLocalAssistant(question: string, tasks: Task[], subjects: string[]): AssistantResult {
  const normalized = normalizeText(question)
  const wantsCreate =
    /^(crea|crear|agrega|agregar|anade|añade|nueva)\s+(una\s+)?(tarea|actividad|deber)/i.test(
      question.trim(),
    )

  if (normalized.includes('qué puedes hacer') || normalized.includes('que puedes hacer') || normalized.includes('ayuda')) {
    return {
      answer:
        'Puedo consultar tus tareas, crear actividades, resumir carga, sugerir un plan, buscar tareas con audio o imagen y leer respuestas en voz alta. Ejemplo: "agrega tarea estudiar SQL para mañana a las 18:30 prioridad alta".',
    }
  }

  if (wantsCreate) {
    const title = cleanTaskTitleFromCommand(question) || 'Nueva actividad'
    const taskDraft: TaskDraft = {
      title,
      description: 'Creada por el asistente local desde un comando de texto.',
      course: getCourseFromText(normalized, subjects),
      date: getDateFromQuestion(question) ?? formatIso(new Date()),
      time: getTimeFromText(question),
      priority: getPriorityFromText(normalized),
      reminder: true,
      imageUri: null,
      audioUri: null,
    }

    return {
      answer: `¡Listo! Creé la tarea "${taskDraft.title}" para ${taskDraft.date} a las ${taskDraft.time}.`,
      taskDraft,
    }
  }

  if (normalized.includes('plan') || normalized.includes('organiza') || normalized.includes('prioriza')) {
    return { answer: buildPlan(tasks) }
  }

  if (normalized.includes('resumen') || normalized.includes('carga') || normalized.includes('materias')) {
    return { answer: summarizeWorkload(tasks, subjects) }
  }

  const onlyPending = !normalized.includes('completad')
  const date = getDateFromQuestion(question)

  let matches = tasks.filter((task) => (onlyPending ? !task.done : true))

  if (date) {
    matches = matches.filter((task) => task.date === date)
  }

  const course = subjects.find((item) => normalized.includes(normalizeText(item)))
  if (course) {
    matches = matches.filter((task) => task.course === course)
  }

  if (normalized.includes('alta') || normalized.includes('urgente')) {
    matches = matches.filter((task) => task.priority === 'Alta')
  }

  if (normalized.includes('imagen')) {
    matches = matches.filter((task) => task.imageUri)
  }

  if (normalized.includes('audio') || normalized.includes('voz')) {
    matches = matches.filter((task) => task.audioUri)
  }

  if (normalized.includes('cuántas') || normalized.includes('cuantas') || normalized.includes('cuántos') || normalized.includes('cuantos')) {
    return { answer: `Tienes ${matches.length} actividad${matches.length === 1 ? '' : 'es'} que coinciden con eso.` }
  }

  if (!matches.length) {
    return {
      answer: date
        ? `No encontré tareas pendientes para ${date}.`
        : 'No encontré tareas con esos filtros. Puedes preguntar: "¿qué deber tengo para el martes?", "plan de estudio" o "agrega tarea estudiar SQL para mañana a las 18:30".',
    }
  }

  const header = date
    ? `Para ${date} tienes ${matches.length} actividad${matches.length === 1 ? '' : 'es'}:`
    : `Encontré ${matches.length} actividad${matches.length === 1 ? '' : 'es'}:`

  return { answer: `${header}\n${matches.slice(0, 5).map(formatTaskLine).join('\n')}` }
}

function speakText(text: string) {
  Speech.stop()
  Speech.speak(text.replace(/\n/g, '. '), {
    language: 'es-ES',
    pitch: 1,
    rate: 0.92,
  })
}

function taskToSpeech(task: Task) {
  return `${task.title}. Materia: ${task.course}. Fecha: ${task.date}, hora ${task.time}. Prioridad ${task.priority}. ${task.description || 'Sin descripción.'}`
}

function useKeyboardVisible() {
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsVisible(true))
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsVisible(false))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])
  return isVisible
}

function ScrollSpacer() {
  const insets = useSafeAreaInsets()
  return <View style={{ height: 116 + Math.max(insets.bottom, 16) }} />
}

function Fab({ onPress, styles }: { onPress: () => void, styles: ReturnType<typeof createStyles> }) {
  const isKeyboardVisible = useKeyboardVisible()
  const insets = useSafeAreaInsets()
  const bottomInset = Math.max(insets.bottom, 16)

  if (isKeyboardVisible) return null

  return (
    <Pressable
      style={[styles.fab, { bottom: bottomInset + 105 }]}
      onPress={onPress}
    >
      <Plus color="#041113" size={32} strokeWidth={2.5} />
    </Pressable>
  )
}

export default function App() {
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null)
  const activePlayerRef = useRef<AudioPlayer | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [themeName, setThemeName] = useState<ThemeName>('dark')
  const theme = themes[themeName]

  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync(theme.bg).catch(() => {})
    }
  }, [theme.bg])

  const [fontScale, setFontScale] = useState<FontScale>(1)
  const [voiceMode, setVoiceMode] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectSubtasks, setProjectSubtasks] = useState<ProjectSubtask[]>([])
  const [query, setQuery] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [subjectModalVisible, setSubjectModalVisible] = useState(false)
  const [projectModalVisible, setProjectModalVisible] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(formatIso(new Date()))
  const [isReady, setIsReady] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const styles = useMemo(() => createStyles(theme, fontScale), [theme, fontScale])
  const today = formatIso(new Date())

  useEffect(() => {
    let mounted = true

    async function boot() {
      const db = await SQLite.openDatabaseAsync(dbName)
      dbRef.current = db
      await setupDatabase(db)

      const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tasks;')
      if ((count?.count ?? 0) === 0) {
        for (const task of starterTasks()) {
          await insertTask(db, task)
        }
      }

      const subjectCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM subjects;')
      if ((subjectCount?.count ?? 0) === 0) {
        for (const subject of starterSubjects()) {
          await insertSubject(db, subject)
        }
      }

      const projectCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM projects;')
      if ((projectCount?.count ?? 0) === 0) {
        for (const project of starterProjects()) {
          await insertProject(db, project)
        }
      }

      const subtaskCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM project_subtasks;',
      )
      if ((subtaskCount?.count ?? 0) === 0) {
        for (const subtask of starterProjectSubtasks()) {
          await insertProjectSubtask(db, subtask)
        }
      }

      const savedTheme = await db.getFirstAsync<{ value: ThemeName }>(
        'SELECT value FROM settings WHERE key = ?;',
        'theme',
      )
      const savedFontScale = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?;',
        'fontScale',
      )
      const savedVoiceMode = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?;',
        'voiceMode',
      )
      const nextTasks = await loadTasks(db)
      const nextSubjects = await loadSubjects(db)
      const nextProjects = await loadProjects(db)
      const nextProjectSubtasks = await loadProjectSubtasks(db)

      if (!mounted) return
      setTasks(nextTasks)
      setSubjects(nextSubjects)
      setProjects(nextProjects)
      setProjectSubtasks(nextProjectSubtasks)
      if (savedTheme?.value === 'dark' || savedTheme?.value === 'light') {
        setThemeName(savedTheme.value)
      }
      const parsedScale = Number(savedFontScale?.value)
      if (fontScales.includes(parsedScale as FontScale)) {
        setFontScale(parsedScale as FontScale)
      }
      setVoiceMode(savedVoiceMode?.value === 'true')
      setIsReady(true)
    }

    boot().catch((error) => Alert.alert('Error de base de datos', String(error)))

    return () => {
      mounted = false
      activePlayerRef.current?.remove()
    }
  }, [])

  const saveTheme = async (nextTheme: ThemeName) => {
    setThemeName(nextTheme)
    await dbRef.current?.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
      'theme',
      nextTheme,
    )
  }

  const saveFontScale = async (nextScale: FontScale) => {
    setFontScale(nextScale)
    await dbRef.current?.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
      'fontScale',
      String(nextScale),
    )
  }

  const saveVoiceMode = async (enabled: boolean) => {
    setVoiceMode(enabled)
    await dbRef.current?.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
      'voiceMode',
      String(enabled),
    )
    if (enabled) {
      speakText('Modo voz activado. Puedes usar el asistente local y escuchar detalles de actividades.')
    } else {
      Speech.stop()
    }
  }

  const refreshTasks = async () => {
    const db = dbRef.current
    if (!db) return
    setTasks(await loadTasks(db))
  }

  const refreshSubjects = async () => {
    const db = dbRef.current
    if (!db) return
    setSubjects(await loadSubjects(db))
  }

  const refreshProjects = async () => {
    const db = dbRef.current
    if (!db) return
    setProjects(await loadProjects(db))
    setProjectSubtasks(await loadProjectSubtasks(db))
  }

  const filteredTasks = useMemo(() => {
    const normalized = normalizeText(query.trim())
    return tasks.filter((task) =>
      normalized
        ? normalizeText(
            `${task.title} ${task.course} ${task.description} ${task.audioUri ? 'voz audio microfono' : ''} ${
              task.imageUri ? 'imagen foto' : ''
            }`,
          ).includes(normalized)
        : true,
    )
  }, [query, tasks])

  const todayTasks = filteredTasks.filter((task) => task.date === today)
  const pendingCount = tasks.filter((task) => !task.done).length
  const completedCount = tasks.filter((task) => task.done).length
  const audioCount = tasks.filter((task) => task.audioUri).length
  const imageCount = tasks.filter((task) => task.imageUri).length
  const selectedTask = selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) ?? null : null
  const selectedCourseTasks = selectedCourse
    ? tasks.filter((task) => task.course === selectedCourse).sort((a, b) => `${a.done}`.localeCompare(`${b.done}`))
    : []
  const selectedProject = selectedProjectId
    ? projects.find((project) => project.id === selectedProjectId) ?? null
    : null
  const selectedProjectSubtasks = selectedProject
    ? projectSubtasks.filter((subtask) => subtask.projectId === selectedProject.id)
    : []
  const subjectNames = subjects.map((subject) => subject.name)

  const addSubject = async (name: string) => {
    const cleanName = name.trim()
    const db = dbRef.current
    if (!db || !cleanName) return
    await insertSubject(db, { id: makeId(), name: cleanName, createdAt: new Date().toISOString() })
    await refreshSubjects()
  }

  const addProject = async (input: ProjectDraft) => {
    const db = dbRef.current
    if (!db) return
    await insertProject(db, { ...input, id: makeId(), createdAt: new Date().toISOString() })
    await refreshProjects()
    setProjectModalVisible(false)
    setActiveTab('projects')
  }

  const updateProject = async (project: Project) => {
    const db = dbRef.current
    if (!db) return
    await updateProjectInDb(db, project)
    await refreshProjects()
  }

  const deleteProject = async (project: Project) => {
    Alert.alert('Eliminar proyecto', `Se eliminará "${project.title}" y sus subtareas.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await dbRef.current?.runAsync('DELETE FROM project_subtasks WHERE projectId = ?;', project.id)
          await dbRef.current?.runAsync('DELETE FROM projects WHERE id = ?;', project.id)
          if (selectedProjectId === project.id) setSelectedProjectId(null)
          await refreshProjects()
        },
      },
    ])
  }

  const addProjectSubtask = async (input: ProjectSubtaskDraft) => {
    const db = dbRef.current
    if (!db) return
    await insertProjectSubtask(db, { ...input, id: makeId(), createdAt: new Date().toISOString() })
    await refreshProjects()
  }

  const toggleProjectSubtask = async (subtask: ProjectSubtask) => {
    await dbRef.current?.runAsync(
      'UPDATE project_subtasks SET done = ? WHERE id = ?;',
      subtask.done ? 0 : 1,
      subtask.id,
    )
    await refreshProjects()
  }

  const deleteProjectSubtask = async (subtask: ProjectSubtask) => {
    await dbRef.current?.runAsync('DELETE FROM project_subtasks WHERE id = ?;', subtask.id)
    await refreshProjects()
  }

  const addTask = async (input: TaskDraft) => {
    const db = dbRef.current
    if (!db) return

    const task: Task = {
      ...input,
      id: makeId(),
      done: false,
      createdAt: new Date().toISOString(),
    }

    await insertTask(db, task)
    await refreshTasks()
    setModalVisible(false)
    setActiveTab('home')
  }

  const toggleTask = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId)
    if (!task) return
    await dbRef.current?.runAsync('UPDATE tasks SET done = ? WHERE id = ?;', task.done ? 0 : 1, taskId)
    await refreshTasks()
  }

  const deleteTask = async (task: Task) => {
    Alert.alert('Eliminar tarea', `Se eliminará "${task.title}".`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await dbRef.current?.runAsync('DELETE FROM tasks WHERE id = ?;', task.id)
          if (selectedTaskId === task.id) setSelectedTaskId(null)
          await refreshTasks()
        },
      },
    ])
  }

  const updateTask = async (task: Task) => {
    const db = dbRef.current
    if (!db) return
    await updateTaskInDb(db, task)
    await refreshTasks()
  }

  const playAudio = (uri: string) => {
    activePlayerRef.current?.remove()
    const player = createAudioPlayer({ uri })
    activePlayerRef.current = player
    player.play()
  }

  const resetData = async () => {
    Alert.alert('Reiniciar datos', 'Esto borrará tareas guardadas y cargará datos de ejemplo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reiniciar',
        style: 'destructive',
        onPress: async () => {
          const db = dbRef.current
          if (!db) return
          await db.runAsync('DELETE FROM tasks;')
          await db.runAsync('DELETE FROM subjects;')
          await db.runAsync('DELETE FROM project_subtasks;')
          await db.runAsync('DELETE FROM projects;')
          for (const task of starterTasks()) {
            await insertTask(db, task)
          }
          for (const subject of starterSubjects()) {
            await insertSubject(db, subject)
          }
          for (const project of starterProjects()) {
            await insertProject(db, project)
          }
          for (const subtask of starterProjectSubtasks()) {
            await insertProjectSubtask(db, subtask)
          }
          await refreshTasks()
          await refreshSubjects()
          await refreshProjects()
        },
      },
    ])
  }

  if (!isReady) {
    return (
      <View style={[styles.app, styles.loadingScreen]}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={styles.cardMuted}>Preparando SQLite...</Text>
      </View>
    )
  }

  return (
    <View style={styles.app}>
      <SystemBars style={themeName === 'dark' ? 'light' : 'dark'} />
    <SafeAreaProvider initialMetrics={initialWindowMetrics} style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient
        colors={themeName === 'dark' ? ['#08353b', theme.bg] : ['#d8f1f5', theme.bg]}
        style={styles.gradient}
      >
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.screen}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Header pendingCount={pendingCount} styles={styles} theme={theme} />
            <SearchBar
              query={query}
              setQuery={setQuery}
              styles={styles}
              theme={theme}
              onSubmitEditing={() => {
                if (activeTab === 'home') {
                  scrollViewRef.current?.scrollTo({ y: 420, animated: true })
                }
              }}
              onMicPress={() => {
                setQuery((current) => (normalizeText(current).includes('voz') ? '' : 'voz'))
                setActiveTab('calendar')
              }}
              onAssistantPress={() => setActiveTab('assistant')}
            />

            {activeTab === 'home' && (
              <HomeView
                completedCount={completedCount}
                pendingCount={pendingCount}
                setActiveTab={setActiveTab}
                styles={styles}
                tasks={todayTasks}
                theme={theme}
                toggleTask={toggleTask}
                deleteTask={deleteTask}
                playAudio={playAudio}
                audioCount={audioCount}
                imageCount={imageCount}
                onOpenTask={setSelectedTaskId}
                projects={projects}
                subtasks={projectSubtasks}
                onOpenProject={setSelectedProjectId}
              />
            )}
            {activeTab === 'calendar' && (
              <CalendarView
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                styles={styles}
                tasks={filteredTasks}
                theme={theme}
                toggleTask={toggleTask}
                deleteTask={deleteTask}
                playAudio={playAudio}
                onOpenTask={setSelectedTaskId}
              />
            )}
            {activeTab === 'projects' && (
              <ProjectsView
                styles={styles}
                tasks={tasks}
                theme={theme}
                projects={projects}
                subjects={subjects}
                subtasks={projectSubtasks}
                onAddProject={() => setProjectModalVisible(true)}
                onAddSubject={() => setSubjectModalVisible(true)}
                onOpenCourse={setSelectedCourse}
                onOpenProject={setSelectedProjectId}
              />
            )}
            {activeTab === 'assistant' && (
              <AssistantView
                styles={styles}
                tasks={tasks}
                theme={theme}
                voiceMode={voiceMode}
                subjects={subjectNames}
                onCreateTask={addTask}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView
                styles={styles}
                taskCount={tasks.length}
                theme={theme}
                themeName={themeName}
                setThemeName={saveTheme}
                fontScale={fontScale}
                setFontScale={saveFontScale}
                voiceMode={voiceMode}
                setVoiceMode={saveVoiceMode}
                resetData={resetData}
                imageCount={imageCount}
                audioCount={audioCount}
              />
            )}
            <ScrollSpacer />
          </ScrollView>

          <Fab onPress={() => setModalVisible(true)} styles={styles} />

          <BottomTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            styles={styles}
            theme={theme}
          />
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>

      <TaskModal
        defaultDate={today}
        onClose={() => setModalVisible(false)}
        onSubmit={addTask}
        courses={subjectNames}
        styles={styles}
        theme={theme}
        visible={modalVisible}
      />
      <SubjectModal
        onClose={() => setSubjectModalVisible(false)}
        onSubmit={addSubject}
        styles={styles}
        theme={theme}
        visible={subjectModalVisible}
      />
      <ProjectModal
        courses={subjectNames}
        onClose={() => setProjectModalVisible(false)}
        onSubmit={addProject}
        styles={styles}
        theme={theme}
        visible={projectModalVisible}
      />
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onDelete={deleteTask}
        onPlayAudio={playAudio}
        onSave={updateTask}
        voiceMode={voiceMode}
        styles={styles}
        theme={theme}
      />
      <CourseTasksModal
        course={selectedCourse}
        tasks={selectedCourseTasks}
        onClose={() => setSelectedCourse(null)}
        onOpenTask={setSelectedTaskId}
        toggleTask={toggleTask}
        deleteTask={deleteTask}
        playAudio={playAudio}
        styles={styles}
        theme={theme}
      />
      <ProjectDetailModal
        project={selectedProject}
        subtasks={selectedProjectSubtasks}
        courses={subjectNames}
        onClose={() => setSelectedProjectId(null)}
        onSave={updateProject}
        onDelete={deleteProject}
        onAddSubtask={addProjectSubtask}
        onToggleSubtask={toggleProjectSubtask}
        onDeleteSubtask={deleteProjectSubtask}
        styles={styles}
        theme={theme}
      />
    </View>
  )
}

function Header({
  pendingCount,
  styles,
  theme,
}: {
  pendingCount: number
  styles: ReturnType<typeof createStyles>
  theme: Theme
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>Buenos días</Text>
        <Text style={styles.heroTitle}>Estudiante</Text>
        <Text style={styles.subcopy}>{pendingCount} pendientes por organizar hoy</Text>
      </View>
      <View style={styles.avatar}>
        <Text style={[styles.avatarText, { color: theme.accent }]}>E</Text>
      </View>
    </View>
  )
}

function SearchBar({
  onAssistantPress,
  onMicPress,
  onSubmitEditing,
  query,
  setQuery,
  styles,
  theme,
}: {
  onAssistantPress: () => void
  onMicPress: () => void
  onSubmitEditing?: () => void
  query: string
  setQuery: Dispatch<SetStateAction<string>>
  styles: ReturnType<typeof createStyles>
  theme: Theme
}) {
  return (
    <View style={styles.searchBar}>
      <Search color={theme.soft} size={21} />
      <TextInput
        placeholder="Buscar tareas, proyectos..."
        placeholderTextColor={theme.muted}
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={onSubmitEditing}
      />
      <Pressable style={styles.searchIconButton} onPress={onAssistantPress}>
        <Bot color={theme.muted} size={21} />
      </Pressable>
      <Pressable style={styles.searchIconButton} onPress={onMicPress}>
        <Mic color={theme.muted} size={22} />
      </Pressable>
    </View>
  )
}

function HomeView({
  completedCount,
  pendingCount,
  setActiveTab,
  styles,
  tasks,
  theme,
  toggleTask,
  deleteTask,
  playAudio,
  audioCount,
  imageCount,
  onOpenTask,
  projects,
  subtasks,
  onOpenProject,
}: {
  completedCount: number
  pendingCount: number
  setActiveTab: (tab: Tab) => void
  styles: ReturnType<typeof createStyles>
  tasks: Task[]
  theme: Theme
  toggleTask: (taskId: string) => void
  deleteTask: (task: Task) => void
  playAudio: (uri: string) => void
  audioCount: number
  imageCount: number
  onOpenTask: (taskId: string) => void
  projects: Project[]
  subtasks: ProjectSubtask[]
  onOpenProject: (projectId: string) => void
}) {
  const activeProjects = projects.slice(0, 4)

  return (
    <View style={styles.stack}>
      <View style={styles.metricsGrid}>
        <MetricCard label="Pendientes" value={pendingCount} styles={styles} />
        <MetricCard label="Completadas" value={completedCount} styles={styles} />
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard label="Imágenes" value={imageCount} styles={styles} />
        <MetricCard label="Notas de voz" value={audioCount} styles={styles} />
      </View>

      <View>
        <SectionTitle
          action="Ver todos"
          onAction={() => setActiveTab('projects')}
          styles={styles}
          theme={theme}
          title="Proyectos Activos"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectRail}>
          {activeProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              styles={styles}
              theme={theme}
              subtasks={subtasks.filter((subtask) => subtask.projectId === project.id)}
              onPress={() => onOpenProject(project.id)}
            />
          ))}
        </ScrollView>
      </View>

      <View>
        <SectionTitle styles={styles} theme={theme} title="Tareas de hoy" />
        <TaskList
          emptyText="No hay tareas para hoy."
          styles={styles}
          tasks={tasks}
          theme={theme}
          toggleTask={toggleTask}
          deleteTask={deleteTask}
          playAudio={playAudio}
          onOpenTask={onOpenTask}
        />
      </View>
    </View>
  )
}

function CalendarView({
  selectedDate,
  setSelectedDate,
  styles,
  tasks,
  theme,
  toggleTask,
  deleteTask,
  playAudio,
  onOpenTask,
}: {
  selectedDate: string
  setSelectedDate: (date: string) => void
  styles: ReturnType<typeof createStyles>
  tasks: Task[]
  theme: Theme
  toggleTask: (taskId: string) => void
  deleteTask: (task: Task) => void
  playAudio: (uri: string) => void
  onOpenTask: (taskId: string) => void
}) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    return { iso: formatIso(date), label: weekLabels[date.getDay()], day: date.getDate() }
  })
  const selectedTasks = tasks.filter((task) => task.date === selectedDate)

  return (
    <View style={styles.stack}>
      <View>
        <SectionTitle styles={styles} theme={theme} title="Calendario" />
        <View style={styles.weekStrip}>
          {days.map((day) => {
            const active = day.iso === selectedDate
            return (
              <Pressable
                key={day.iso}
                onPress={() => setSelectedDate(day.iso)}
                style={[styles.dayPill, active && styles.dayPillActive]}
              >
                <Text style={[styles.dayLabel, active && { color: theme.accent }]}>{day.label}</Text>
                <Text style={styles.dayNumber}>{day.day}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.scheduleHeader}>
          <CalendarDays color={theme.accent} size={22} />
          <View>
            <Text style={styles.cardMuted}>Agenda seleccionada</Text>
            <Text style={styles.panelTitle}>{selectedTasks.length} actividades</Text>
          </View>
        </View>
        <TaskList
          emptyText="No hay entregas en esta fecha."
          styles={styles}
          tasks={selectedTasks}
          theme={theme}
          toggleTask={toggleTask}
          deleteTask={deleteTask}
          playAudio={playAudio}
          onOpenTask={onOpenTask}
        />
      </View>
    </View>
  )
}

function ProjectsView({
  onAddProject,
  onAddSubject,
  onOpenCourse,
  onOpenProject,
  projects,
  styles,
  subjects,
  subtasks,
  tasks,
  theme,
}: {
  onAddProject: () => void
  onAddSubject: () => void
  onOpenCourse: (course: string) => void
  onOpenProject: (projectId: string) => void
  projects: Project[]
  styles: ReturnType<typeof createStyles>
  subjects: Subject[]
  subtasks: ProjectSubtask[]
  tasks: Task[]
  theme: Theme
}) {
  return (
    <View style={styles.stack}>
      <View>
        <SectionTitle action="Nuevo" onAction={onAddProject} styles={styles} theme={theme} title="Proyectos" />
        <View style={styles.projectList}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              large
              project={project}
              styles={styles}
              theme={theme}
              subtasks={subtasks.filter((subtask) => subtask.projectId === project.id)}
              onPress={() => onOpenProject(project.id)}
            />
          ))}
        </View>
      </View>

      <View>
        <SectionTitle action="Agregar" onAction={onAddSubject} styles={styles} theme={theme} title="Carga por asignatura" />
        <View style={styles.courseList}>
          {subjects.map((subject) => {
            const courseTasks = tasks.filter((task) => task.course === subject.name)
            const amount = courseTasks.filter((task) => !task.done).length
            return (
              <Pressable key={subject.id} style={styles.courseCard} onPress={() => onOpenCourse(subject.name)}>
                <View style={styles.courseIcon}>
                  <BookOpen color={theme.accent} size={19} />
                </View>
                <View style={styles.settingsCopy}>
                  <Text style={styles.courseTitle}>{subject.name}</Text>
                  <Text style={styles.cardMuted}>
                    {amount} pendientes | {courseTasks.length} tareas
                  </Text>
                </View>
                <ChevronRight color={theme.muted} size={20} />
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

function SettingsView({
  styles,
  taskCount,
  theme,
  themeName,
  setThemeName,
  fontScale,
  setFontScale,
  voiceMode,
  setVoiceMode,
  resetData,
  imageCount,
  audioCount,
}: {
  styles: ReturnType<typeof createStyles>
  taskCount: number
  theme: Theme
  themeName: ThemeName
  setThemeName: (theme: ThemeName) => void
  fontScale: FontScale
  setFontScale: (scale: FontScale) => void
  voiceMode: boolean
  setVoiceMode: (enabled: boolean) => void
  resetData: () => void
  imageCount: number
  audioCount: number
}) {
  const isDark = themeName === 'dark'

  return (
    <View style={styles.stack}>
      <View>
        <SectionTitle styles={styles} theme={theme} title="Ajustes" />
        <View style={styles.settingsCard}>
          <View style={styles.courseIcon}>
            {isDark ? <Moon color={theme.accent} size={24} /> : <Sun color={theme.accent} size={24} />}
          </View>
          <View style={styles.settingsCopy}>
            <Text style={styles.courseTitle}>Modo de apariencia</Text>
            <Text style={styles.cardMuted}>
              {isDark ? 'Oscuro elegante con cian mate' : 'Claro limpio para estudiar de día'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={(enabled) => setThemeName(enabled ? 'dark' : 'light')}
            thumbColor={isDark ? theme.accent : '#ffffff'}
            trackColor={{ false: theme.border, true: theme.accentSoft }}
          />
        </View>
      </View>

      <View>
        <SectionTitle styles={styles} theme={theme} title="Accesibilidad" />
        <View style={styles.settingsCard}>
          <View style={styles.courseIcon}>
            <Text style={styles.accessibilityIconText}>Aa</Text>
          </View>
          <View style={styles.settingsCopy}>
            <Text style={styles.courseTitle}>Tamaño de letra</Text>
            <Text style={styles.cardMuted}>Aumenta texto y espaciado para leer con menos esfuerzo.</Text>
          </View>
        </View>
        <View style={styles.segmentRow}>
          {fontScales.map((scale) => (
            <Pressable
              key={scale}
              style={[styles.segmentButton, fontScale === scale && styles.segmentButtonActive]}
              onPress={() => setFontScale(scale)}
            >
              <Text style={[styles.segmentText, fontScale === scale && { color: theme.accent }]}>
                {scale === 1 ? 'Normal' : scale === 1.15 ? 'Grande' : 'Muy grande'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.settingsCard}>
        <View style={styles.courseIcon}>
          <Mic color={theme.accent} size={23} />
        </View>
        <View style={styles.settingsCopy}>
          <Text style={styles.courseTitle}>Modo voz</Text>
          <Text style={styles.cardMuted}>Lee respuestas del asistente y detalles de actividades en voz alta.</Text>
        </View>
        <Switch
          value={voiceMode}
          onValueChange={setVoiceMode}
          thumbColor={voiceMode ? theme.accent : '#ffffff'}
          trackColor={{ false: theme.border, true: theme.accentSoft }}
        />
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard label="Tareas SQLite" value={taskCount} styles={styles} />
        <MetricCard label="Multimedia" value={imageCount + audioCount} styles={styles} />
      </View>

      <View style={styles.infoPanel}>
        <Bell color={theme.accent} size={22} />
        <View style={styles.settingsCopy}>
          <Text style={styles.courseTitle}>Base local funcional</Text>
          <Text style={styles.cardMuted}>
            Guarda tareas, estado, imágenes, notas de voz y tema en SQLite del dispositivo.
          </Text>
        </View>
      </View>

      <Pressable style={styles.dangerAction} onPress={resetData}>
        <Trash2 color="#ff7a8a" size={18} />
        <Text style={styles.dangerActionText}>Reiniciar datos de prueba</Text>
      </Pressable>
    </View>
  )
}

function AssistantView({
  onCreateTask,
  styles,
  subjects,
  tasks,
  theme,
  voiceMode,
}: {
  onCreateTask: (task: TaskDraft) => Promise<void>
  styles: ReturnType<typeof createStyles>
  subjects: string[]
  tasks: Task[]
  theme: Theme
  voiceMode: boolean
}) {
  const [question, setQuestion] = useState('¿Qué deber tengo para el martes?')
  const [answer, setAnswer] = useState(
    'Soy un asistente local: consulto tareas, creo actividades, resumo carga y ayudo a priorizar sin internet.',
  )

  const handleResult = async (result: AssistantResult) => {
    if (result.taskDraft) {
      await onCreateTask(result.taskDraft)
    }
    setAnswer(result.answer)
    if (voiceMode) speakText(result.answer)
  }

  const ask = async () => {
    if (!question.trim()) return
    Keyboard.dismiss()
    await handleResult(runLocalAssistant(question, tasks, subjects))
  }

  const quickQuestions = [
    '¿Qué deber tengo hoy?',
    '¿Qué deber tengo para el martes?',
    'Plan de estudio',
    'Resumen de carga',
    'Tareas urgentes',
    'Agrega tarea leer capitulo para mañana a las 18:30 prioridad media',
  ]

  return (
    <View style={styles.stack}>
      <View>
        <SectionTitle styles={styles} theme={theme} title="IA local" />
        <View style={styles.infoPanel}>
          <Bot color={theme.accent} size={22} />
          <View style={styles.settingsCopy}>
            <Text style={styles.courseTitle}>Modelo local mejorado</Text>
            <Text style={styles.cardMuted}>
              Entiende días, prioridades, asignaturas, multimedia, planes de estudio y comandos para crear tareas.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.assistantCard}>
        <View style={styles.assistantHeader}>
          <View style={styles.courseIcon}>
            <Bot color={theme.accent} size={21} />
          </View>
          <View style={styles.settingsCopy}>
            <Text style={styles.courseTitle}>Asistente académico</Text>
            <Text style={styles.cardMuted}>Pregunta por días, materias, audios, imágenes o pendientes.</Text>
          </View>
        </View>
        <View style={styles.assistantInputRow}>
          <TextInput
            placeholder="Ej. ¿qué deber tengo para el martes?"
            placeholderTextColor={theme.muted}
            style={styles.assistantInput}
            value={question}
            onChangeText={setQuestion}
          />
          <Pressable style={styles.sendButton} onPress={ask}>
            <Send color="#041113" size={18} />
          </Pressable>
        </View>
        <Text style={styles.assistantAnswer}>{answer}</Text>
        <View style={styles.assistantVoiceRow}>
          <Pressable style={styles.voiceAction} onPress={() => speakText(answer)}>
            <Play color={theme.accent} size={16} />
            <Text style={styles.mediaBadgeText}>Leer respuesta</Text>
          </Pressable>
          <Pressable style={styles.voiceAction} onPress={() => Speech.stop()}>
            <Pause color={theme.accent} size={16} />
            <Text style={styles.mediaBadgeText}>Detener voz</Text>
          </Pressable>
        </View>
        <View style={styles.quickCommandGrid}>
          {quickQuestions.map((item) => (
            <Pressable
              key={item}
              style={styles.quickCommand}
              onPress={async () => {
                Keyboard.dismiss()
                const result = runLocalAssistant(item, tasks, subjects)
                setQuestion(item)
                await handleResult(result)
              }}
            >
              <Text style={styles.quickCommandText}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}

function SubjectModal({
  onClose,
  onSubmit,
  styles,
  theme,
  visible,
}: {
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
  styles: ReturnType<typeof createStyles>
  theme: Theme
  visible: boolean
}) {
  const [name, setName] = useState('')

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Escribe el nombre de la asignatura.')
      return
    }
    await onSubmit(name)
    setName('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.eyebrow}>Nueva asignatura</Text>
                <Text style={styles.modalTitle}>Agregar materia</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X color={theme.muted} size={22} />
              </Pressable>
            </View>
            <TextInput
              placeholder="Ej. Arquitectura de Software"
              placeholderTextColor={theme.muted}
              style={styles.field}
              value={name}
              onChangeText={setName}
            />
            <Pressable style={styles.primaryAction} onPress={submit}>
              <Plus color="#041113" size={18} />
              <Text style={styles.primaryActionText}>Guardar asignatura</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function ProjectModal({
  courses,
  onClose,
  onSubmit,
  styles,
  theme,
  visible,
}: {
  courses: string[]
  onClose: () => void
  onSubmit: (project: ProjectDraft) => Promise<void>
  styles: ReturnType<typeof createStyles>
  theme: Theme
  visible: boolean
}) {
  const [title, setTitle] = useState('')
  const [course, setCourse] = useState(courses[0] ?? 'General')
  const [due, setDue] = useState('Entrega pendiente')
  const [description, setDescription] = useState('')
  const [progress, setProgress] = useState('0')
  const [accent, setAccent] = useState(projectAccents[0])

  useEffect(() => {
    if (visible && courses.length && !courses.includes(course)) setCourse(courses[0])
  }, [course, courses, visible])

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert('Falta el título', 'Escribe un nombre para el proyecto.')
      return
    }
    await onSubmit({
      title: title.trim(),
      course,
      due: due.trim() || 'Entrega pendiente',
      description: description.trim(),
      progress: Math.max(0, Math.min(100, Number(progress) || 0)),
      accent,
    })
    setTitle('')
    setDescription('')
    setDue('Entrega pendiente')
    setProgress('0')
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.eyebrow}>Nuevo proyecto</Text>
                <Text style={styles.modalTitle}>Crear proyecto</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X color={theme.muted} size={22} />
              </Pressable>
            </View>

            <TextInput
              placeholder="Ej. App académica final"
              placeholderTextColor={theme.muted}
              style={styles.field}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              multiline
              placeholder="Objetivo, entregables, enlaces o notas"
              placeholderTextColor={theme.muted}
              style={[styles.field, styles.textArea]}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.formLabel}>Asignatura</Text>
            <View style={styles.chipRow}>
              {courses.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCourse(item)}
                  style={[styles.chip, course === item && styles.chipActive]}
                >
                  <Text style={[styles.chipText, course === item && { color: theme.accent }]}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Entrega</Text>
                <TextInput style={styles.field} value={due} onChangeText={setDue} />
              </View>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Progreso</Text>
                <TextInput keyboardType="numeric" style={styles.field} value={progress} onChangeText={setProgress} />
              </View>
            </View>

            <Text style={styles.formLabel}>Color</Text>
            <View style={styles.swatchRow}>
              {projectAccents.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setAccent(item)}
                  style={[styles.swatch, { backgroundColor: item }, accent === item && styles.swatchActive]}
                />
              ))}
            </View>

            <Pressable style={styles.primaryAction} onPress={submit}>
              <FolderOpen color="#041113" size={18} />
              <Text style={styles.primaryActionText}>Guardar proyecto</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function CourseTasksModal({
  course,
  deleteTask,
  onClose,
  onOpenTask,
  playAudio,
  styles,
  tasks,
  theme,
  toggleTask,
}: {
  course: string | null
  deleteTask: (task: Task) => void
  onClose: () => void
  onOpenTask: (taskId: string) => void
  playAudio: (uri: string) => void
  styles: ReturnType<typeof createStyles>
  tasks: Task[]
  theme: Theme
  toggleTask: (taskId: string) => void
}) {
  if (!course) return null

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.eyebrow}>Carga por asignatura</Text>
                <Text style={styles.modalTitle}>{course}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X color={theme.muted} size={22} />
              </Pressable>
            </View>
            <View style={styles.detailInfoBox}>
              <Text style={styles.cardMuted}>Pendientes</Text>
              <Text style={styles.courseTitle}>{tasks.filter((task) => !task.done).length} deberes por resolver</Text>
            </View>
            <TaskList
              emptyText="No hay deberes en esta asignatura."
              styles={styles}
              tasks={tasks}
              theme={theme}
              toggleTask={toggleTask}
              deleteTask={deleteTask}
              playAudio={playAudio}
              onOpenTask={onOpenTask}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function ProjectDetailModal({
  courses,
  onAddSubtask,
  onClose,
  onDelete,
  onDeleteSubtask,
  onSave,
  onToggleSubtask,
  project,
  styles,
  subtasks,
  theme,
}: {
  courses: string[]
  onAddSubtask: (subtask: ProjectSubtaskDraft) => Promise<void>
  onClose: () => void
  onDelete: (project: Project) => void
  onDeleteSubtask: (subtask: ProjectSubtask) => void
  onSave: (project: Project) => void
  onToggleSubtask: (subtask: ProjectSubtask) => void
  project: Project | null
  styles: ReturnType<typeof createStyles>
  subtasks: ProjectSubtask[]
  theme: Theme
}) {
  const [title, setTitle] = useState('')
  const [course, setCourse] = useState('')
  const [due, setDue] = useState('')
  const [description, setDescription] = useState('')
  const [progress, setProgress] = useState('0')
  const [newSubtask, setNewSubtask] = useState('')

  useEffect(() => {
    if (!project) return
    setTitle(project.title)
    setCourse(project.course)
    setDue(project.due)
    setDescription(project.description)
    setProgress(String(project.progress))
    setNewSubtask('')
  }, [project])

  if (!project) return null

  const done = subtasks.filter((subtask) => subtask.done).length
  const computedProgress = subtasks.length ? Math.round((done / subtasks.length) * 100) : Number(progress) || 0

  const save = () => {
    if (!title.trim()) {
      Alert.alert('Falta el título', 'El proyecto necesita un título.')
      return
    }
    onSave({
      ...project,
      title: title.trim(),
      course: course || project.course,
      due: due.trim() || project.due,
      description: description.trim(),
      progress: Math.max(0, Math.min(100, computedProgress)),
    })
  }

  const addSubtask = async () => {
    if (!newSubtask.trim()) return
    await onAddSubtask({ projectId: project.id, title: newSubtask.trim(), done: false })
    setNewSubtask('')
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.eyebrow}>Detalle de proyecto</Text>
                <Text style={styles.modalTitle}>{project.title}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X color={theme.muted} size={22} />
              </Pressable>
            </View>

            <Text style={styles.formLabel}>Título</Text>
            <TextInput style={styles.field} value={title} onChangeText={setTitle} />
            <Text style={styles.formLabel}>Descripción</Text>
            <TextInput multiline style={[styles.field, styles.textArea]} value={description} onChangeText={setDescription} />

            <Text style={styles.formLabel}>Asignatura</Text>
            <View style={styles.chipRow}>
              {courses.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCourse(item)}
                  style={[styles.chip, course === item && styles.chipActive]}
                >
                  <Text style={[styles.chipText, course === item && { color: theme.accent }]}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Entrega</Text>
                <TextInput style={styles.field} value={due} onChangeText={setDue} />
              </View>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Progreso</Text>
                <TextInput keyboardType="numeric" style={styles.field} value={String(computedProgress)} onChangeText={setProgress} />
              </View>
            </View>

            <View style={styles.detailInfoBox}>
              <Text style={styles.cardMuted}>Avance por subtareas</Text>
              <Text style={styles.courseTitle}>{done}/{subtasks.length} completadas | {computedProgress}%</Text>
            </View>

            <View style={styles.assistantInputRow}>
              <TextInput
                placeholder="Nueva subtarea"
                placeholderTextColor={theme.muted}
                style={styles.assistantInput}
                value={newSubtask}
                onChangeText={setNewSubtask}
              />
              <Pressable style={styles.sendButton} onPress={addSubtask}>
                <Plus color="#041113" size={18} />
              </Pressable>
            </View>

            <View style={styles.subtaskList}>
              {subtasks.map((subtask) => (
                <View key={subtask.id} style={styles.subtaskRow}>
                  <Pressable style={styles.taskCheck} onPress={() => onToggleSubtask(subtask)}>
                    {subtask.done && <Check color={theme.text} size={17} strokeWidth={3} />}
                  </Pressable>
                  <Text style={[styles.subtaskText, subtask.done && styles.taskTitleDone]}>{subtask.title}</Text>
                  <Pressable style={styles.iconButton} onPress={() => onDeleteSubtask(subtask)}>
                    <Trash2 color={theme.soft} size={17} />
                  </Pressable>
                </View>
              ))}
            </View>

            <Pressable style={styles.primaryAction} onPress={save}>
              <Save color="#041113" size={18} />
              <Text style={styles.primaryActionText}>Guardar proyecto</Text>
            </Pressable>
            <Pressable style={styles.dangerAction} onPress={() => onDelete(project)}>
              <Trash2 color="#ff7a8a" size={18} />
              <Text style={styles.dangerActionText}>Eliminar proyecto</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function TaskDetailModal({
  task,
  onClose,
  onDelete,
  onPlayAudio,
  onSave,
  voiceMode,
  styles,
  theme,
}: {
  task: Task | null
  onClose: () => void
  onDelete: (task: Task) => void
  onPlayAudio: (uri: string) => void
  onSave: (task: Task) => void
  voiceMode: boolean
  styles: ReturnType<typeof createStyles>
  theme: Theme
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [priority, setPriority] = useState<Priority>('Media')

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) setDate(formatIso(selectedDate))
  }

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false)
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0')
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0')
      setTime(`${hours}:${minutes}`)
    }
  }

  const getParsedDate = () => {
    const dStr = date || task?.date || formatIso(new Date())
    const parts = dStr.split('-')
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    }
    return new Date()
  }
  const getParsedTime = () => {
    const [h, m] = (time || task?.time || '08:00').split(':')
    const d = new Date()
    d.setHours(Number(h) || 8, Number(m) || 0, 0, 0)
    return d
  }

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description)
    setDate(task.date)
    setTime(task.time)
    setPriority(task.priority)
    if (voiceMode) speakText(taskToSpeech(task))
  }, [task])

  if (!task) return null

  const save = () => {
    if (!title.trim()) {
      Alert.alert('Falta el título', 'La actividad necesita un título.')
      return
    }

    const finalDate = date.trim() || task.date
    const finalTime = time.trim() || task.time
    const errorMsg = validateDateTime(finalDate, finalTime)
    if (errorMsg) {
      Alert.alert('Formato incorrecto', errorMsg)
      return
    }

    onSave({
      ...task,
      title: title.trim(),
      description: description.trim(),
      date: finalDate,
      time: finalTime,
      priority,
    })
    onClose()
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.eyebrow}>Detalle de actividad</Text>
                <Text style={styles.modalTitle}>{task.title}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X color={theme.muted} size={22} />
              </Pressable>
            </View>

            {task.imageUri && <RNImage source={{ uri: task.imageUri }} style={styles.detailImage} />}

            <Text style={styles.formLabel}>Título</Text>
            <TextInput style={styles.field} value={title} onChangeText={setTitle} />

            <Text style={styles.formLabel}>Descripción</Text>
            <TextInput
              multiline
              style={[styles.field, styles.textArea]}
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Fecha</Text>
                <Pressable onPress={() => setShowDatePicker(true)}>
                  <View pointerEvents="none">
                    <TextInput style={styles.field} value={date} editable={false} />
                  </View>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={getParsedDate()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                )}
              </View>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Hora</Text>
                <Pressable onPress={() => setShowTimePicker(true)}>
                  <View pointerEvents="none">
                    <TextInput style={styles.field} value={time} editable={false} />
                  </View>
                </Pressable>
                {showTimePicker && (
                  <DateTimePicker
                    value={getParsedTime()}
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                  />
                )}
              </View>
            </View>

            <Text style={styles.formLabel}>Prioridad</Text>
            <View style={styles.chipRow}>
              {(['Alta', 'Media', 'Baja'] as Priority[]).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setPriority(item)}
                  style={[styles.chip, priority === item && styles.chipActive]}
                >
                  <Text style={[styles.chipText, priority === item && { color: theme.accent }]}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.detailInfoBox}>
              <Text style={styles.cardMuted}>Materia</Text>
              <Text style={styles.courseTitle}>{task.course}</Text>
              <Text style={styles.cardMuted}>
                Estado: {task.done ? 'Completada' : 'Pendiente'} | Recordatorio: {task.reminder ? 'Sí' : 'No'}
              </Text>
            </View>

            <View style={styles.attachmentRow}>
              <Pressable style={styles.attachmentButton} onPress={() => speakText(taskToSpeech(task))}>
                <Play color={theme.accent} size={18} />
                <Text style={styles.chipText}>Leer actividad</Text>
              </Pressable>
              {task.audioUri && (
                <Pressable style={styles.attachmentButton} onPress={() => onPlayAudio(task.audioUri!)}>
                  <Play color={theme.accent} size={18} />
                  <Text style={styles.chipText}>Reproducir audio</Text>
                </Pressable>
              )}
              {task.imageUri && (
                <View style={styles.attachmentButton}>
                  <ImageIcon color={theme.accent} size={18} />
                  <Text style={styles.chipText}>Imagen guardada</Text>
                </View>
              )}
            </View>

            <Pressable style={styles.primaryAction} onPress={save}>
              <Save color="#041113" size={18} />
              <Text style={styles.primaryActionText}>Guardar cambios</Text>
            </Pressable>

            <Pressable style={styles.dangerAction} onPress={() => onDelete(task)}>
              <Trash2 color="#ff7a8a" size={18} />
              <Text style={styles.dangerActionText}>Eliminar actividad</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function TaskModal({
  courses,
  defaultDate,
  onClose,
  onSubmit,
  styles,
  theme,
  visible,
}: {
  courses: string[]
  defaultDate: string
  onClose: () => void
  onSubmit: (task: TaskDraft) => void
  styles: ReturnType<typeof createStyles>
  theme: Theme
  visible: boolean
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const recorderState = useAudioRecorderState(recorder)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [course, setCourse] = useState(courses[0] ?? 'General')
  const [priority, setPriority] = useState<Priority>('Media')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('08:00')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) setDate(formatIso(selectedDate))
  }

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false)
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0')
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0')
      setTime(`${hours}:${minutes}`)
    }
  }

  const getParsedDate = () => {
    const dStr = date || defaultDate
    const parts = dStr.split('-')
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    }
    return new Date()
  }
  const getParsedTime = () => {
    const [h, m] = (time || '08:00').split(':')
    const d = new Date()
    d.setHours(Number(h) || 8, Number(m) || 0, 0, 0)
    return d
  }

  const [imageUri, setImageUri] = useState<string | null>(null)
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [isSavingMedia, setIsSavingMedia] = useState(false)

  useEffect(() => {
    if (visible) setDate(defaultDate)
  }, [defaultDate, visible])

  useEffect(() => {
    if (visible && courses.length && !courses.includes(course)) {
      setCourse(courses[0])
    }
  }, [course, courses, visible])

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Activa el permiso de galería para adjuntar imágenes.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.78,
    })

    if (!result.canceled && result.assets[0]?.uri) {
      setIsSavingMedia(true)
      try {
        setImageUri(await copyToAppStorage(result.assets[0].uri, '.jpg'))
      } finally {
        setIsSavingMedia(false)
      }
    }
  }

  const toggleRecording = async () => {
    if (recorderState.isRecording) {
      await recorder.stop()
      const uri = recorder.uri ?? recorder.getStatus().url
      if (uri) {
        setIsSavingMedia(true)
        try {
          setAudioUri(await copyToAppStorage(uri, '.m4a'))
        } finally {
          setIsSavingMedia(false)
        }
      }
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
      return
    }

    const permission = await requestRecordingPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Activa el micrófono para grabar notas de voz.')
      return
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await recorder.prepareToRecordAsync()
    recorder.record()
  }

  const submit = () => {
    if (!title.trim()) {
      Alert.alert('Falta el título', 'Escribe un título corto para guardar la tarea.')
      return
    }

    const finalDate = date.trim() || defaultDate
    const finalTime = time.trim() || '08:00'
    const errorMsg = validateDateTime(finalDate, finalTime)
    if (errorMsg) {
      Alert.alert('Formato incorrecto', errorMsg)
      return
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      course,
      date: finalDate,
      time: finalTime,
      priority,
      reminder: true,
      imageUri,
      audioUri,
    })

    setTitle('')
    setDescription('')
    setPriority('Media')
    setImageUri(null)
    setAudioUri(null)
    setTime('08:00')
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.eyebrow}>Nueva actividad</Text>
                <Text style={styles.modalTitle}>Nueva tarea</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X color={theme.muted} size={22} />
              </Pressable>
            </View>

            <TextInput
              placeholder="Ej. Subir informe de usabilidad"
              placeholderTextColor={theme.muted}
              style={styles.field}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              multiline
              placeholder="Descripción, enlaces o notas importantes"
              placeholderTextColor={theme.muted}
              style={[styles.field, styles.textArea]}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.formLabel}>Asignatura</Text>
            <View style={styles.chipRow}>
              {courses.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCourse(item)}
                  style={[styles.chip, course === item && styles.chipActive]}
                >
                  <Text style={[styles.chipText, course === item && { color: theme.accent }]}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Fecha</Text>
                <Pressable onPress={() => setShowDatePicker(true)}>
                  <View pointerEvents="none">
                    <TextInput
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.muted}
                      style={styles.field}
                      value={date}
                      editable={false}
                    />
                  </View>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={getParsedDate()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                )}
              </View>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Hora</Text>
                <Pressable onPress={() => setShowTimePicker(true)}>
                  <View pointerEvents="none">
                    <TextInput
                      placeholder="HH:mm"
                      placeholderTextColor={theme.muted}
                      style={styles.field}
                      value={time}
                      editable={false}
                    />
                  </View>
                </Pressable>
                {showTimePicker && (
                  <DateTimePicker
                    value={getParsedTime()}
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                  />
                )}
              </View>
            </View>

            <Text style={styles.formLabel}>Prioridad</Text>
            <View style={styles.chipRow}>
              {(['Alta', 'Media', 'Baja'] as Priority[]).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setPriority(item)}
                  style={[styles.chip, priority === item && styles.chipActive]}
                >
                  <Text style={[styles.chipText, priority === item && { color: theme.accent }]}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.attachmentRow}>
              <Pressable style={styles.attachmentButton} onPress={pickImage} disabled={isSavingMedia}>
                <Camera color={theme.accent} size={18} />
                <Text style={styles.chipText}>{imageUri ? 'Cambiar imagen' : 'Imagen'}</Text>
              </Pressable>
              <Pressable style={styles.attachmentButton} onPress={toggleRecording} disabled={isSavingMedia}>
                {recorderState.isRecording ? (
                  <Pause color={theme.accent} size={18} />
                ) : (
                  <Mic color={theme.accent} size={18} />
                )}
                <Text style={styles.chipText}>
                  {recorderState.isRecording ? 'Detener' : audioUri ? 'Regrabar' : 'Grabar voz'}
                </Text>
              </Pressable>
            </View>

            {isSavingMedia && <Text style={styles.cardMuted}>Guardando archivo...</Text>}
            {imageUri && <RNImage source={{ uri: imageUri }} style={styles.previewImage} />}
            {audioUri && (
              <View style={styles.audioSaved}>
                <AudioLines color={theme.accent} size={18} />
                <Text style={styles.cardMuted}>Nota de voz guardada</Text>
              </View>
            )}

            <Pressable style={styles.primaryAction} onPress={submit}>
              <Text style={styles.primaryActionText}>Guardar en SQLite</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function SectionTitle({
  action,
  onAction,
  styles,
  theme,
  title,
}: {
  action?: string
  onAction?: () => void
  styles: ReturnType<typeof createStyles>
  theme: Theme
  title: string
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionHeading}>{title}</Text>
      {action && (
        <Pressable style={styles.sectionAction} onPress={onAction}>
          <Text style={[styles.sectionActionText, { color: theme.accent }]}>{action}</Text>
          <ChevronRight color={theme.accent} size={18} />
        </Pressable>
      )}
    </View>
  )
}

function ProjectCard({
  large,
  onPress,
  project,
  styles,
  subtasks,
  theme,
}: {
  large?: boolean
  onPress: () => void
  project: Project
  styles: ReturnType<typeof createStyles>
  subtasks: ProjectSubtask[]
  theme: Theme
}) {
  const done = subtasks.filter((subtask) => subtask.done).length
  const progress = subtasks.length ? Math.round((done / subtasks.length) * 100) : project.progress

  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={theme.name === 'dark' ? ['rgba(255,255,255,0.16)', theme.card] : ['#ffffff', theme.card]}
        style={[styles.projectCard, large && styles.projectCardLarge]}
      >
        <View style={styles.projectTopline}>
          <View style={[styles.projectMark, { backgroundColor: project.accent }]} />
          <ChevronRight color={theme.muted} size={20} />
        </View>
        <Text style={styles.projectTitle}>{project.title}</Text>
        <Text style={styles.cardMuted}>{project.course}</Text>
        {!!project.description && large && <Text style={styles.taskDescription}>{project.description}</Text>}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: project.accent }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
        <Text style={styles.cardMuted}>
          {project.due} | {done}/{subtasks.length} subtareas
        </Text>
      </LinearGradient>
    </Pressable>
  )
}

function TaskList({
  emptyText,
  styles,
  tasks,
  theme,
  toggleTask,
  deleteTask,
  playAudio,
  onOpenTask,
}: {
  emptyText: string
  styles: ReturnType<typeof createStyles>
  tasks: Task[]
  theme: Theme
  toggleTask: (taskId: string) => void
  deleteTask: (task: Task) => void
  playAudio: (uri: string) => void
  onOpenTask: (taskId: string) => void
}) {
  if (!tasks.length) {
    return (
      <View style={styles.emptyState}>
        <CalendarDays color={theme.muted} size={38} />
        <Text style={styles.cardMuted}>{emptyText}</Text>
      </View>
    )
  }

  return (
    <View style={styles.taskList}>
      {tasks.map((task) => (
        <Pressable
          key={task.id}
          style={[styles.taskCard, task.done && styles.taskDone]}
          onPress={() => onOpenTask(task.id)}
        >
          <View style={styles.taskTopRow}>
            <Pressable style={styles.taskCheck} onPress={() => toggleTask(task.id)}>
              {task.done && <Check color={theme.text} size={17} strokeWidth={3} />}
            </Pressable>
            <View style={styles.taskBody}>
              <View style={styles.taskHeading}>
                <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>{task.title}</Text>
                <PriorityBadge priority={task.priority} styles={styles} />
              </View>
              <Text style={styles.cardMuted}>{task.course}</Text>
              {!!task.description && <Text style={styles.taskDescription}>{task.description}</Text>}
              <View style={styles.taskMeta}>
                <Clock3 color={theme.soft} size={14} />
                <Text style={styles.metaText}>
                  {task.date} - {task.time}
                </Text>
                {task.reminder && <Bell color={theme.soft} size={14} />}
              </View>
            </View>
            <Pressable style={styles.iconButton} onPress={() => deleteTask(task)}>
              <Trash2 color={theme.soft} size={18} />
            </Pressable>
          </View>

          {task.imageUri && <RNImage source={{ uri: task.imageUri }} style={styles.taskImage} />}

          <View style={styles.mediaActions}>
            {task.imageUri && (
              <View style={styles.mediaBadge}>
                <ImageIcon color={theme.accent} size={15} />
                <Text style={styles.mediaBadgeText}>Imagen</Text>
              </View>
            )}
            {task.audioUri && (
              <Pressable style={styles.mediaBadge} onPress={() => playAudio(task.audioUri!)}>
                <Play color={theme.accent} size={15} />
                <Text style={styles.mediaBadgeText}>Reproducir voz</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  )
}

function PriorityBadge({
  priority,
  styles,
}: {
  priority: Priority
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <View
      style={[
        styles.priority,
        priority === 'Alta' && styles.priorityHigh,
        priority === 'Media' && styles.priorityMid,
        priority === 'Baja' && styles.priorityLow,
      ]}
    >
      <Text
        style={[
          styles.priorityText,
          priority === 'Alta' && styles.priorityHighText,
          priority === 'Media' && styles.priorityMidText,
          priority === 'Baja' && styles.priorityLowText,
        ]}
      >
        {priority}
      </Text>
    </View>
  )
}

function MetricCard({
  label,
  value,
  styles,
}: {
  label: string
  value: number | string
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.cardMuted}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  )
}

function BottomTabs({
  activeTab,
  setActiveTab,
  styles,
  theme,
}: {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  styles: ReturnType<typeof createStyles>
  theme: Theme
}) {
  const isKeyboardVisible = useKeyboardVisible()
  const insets = useSafeAreaInsets()
  const bottomInset = Math.max(insets.bottom, 16)

  const items = [
    { id: 'home' as const, label: 'Inicio', icon: Home },
    { id: 'calendar' as const, label: 'Calendario', icon: CalendarDays },
    { id: 'projects' as const, label: 'Proyectos', icon: LayoutGrid },
    { id: 'assistant' as const, label: 'IA', icon: Bot },
    { id: 'settings' as const, label: 'Ajustes', icon: Settings },
  ]

  if (isKeyboardVisible) return null

  return (
    <View
      style={[
        styles.bottomTabs,
        { height: 86 + bottomInset, paddingBottom: bottomInset }
      ]}
    >
      {items.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id
        return (
          <Pressable key={id} onPress={() => setActiveTab(id)} style={styles.tabButton}>
            <View style={[styles.tabIconWrap, active && styles.tabIconActive]}>
              <Icon color={active ? theme.accent : theme.muted} size={23} />
            </View>
            <Text style={[styles.tabText, active && { color: theme.accent }]}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function createStyles(theme: Theme, fontScale: FontScale) {
  const fontFamily = Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default: 'System',
  })
  const fs = (value: number) => Math.round(value * fontScale)
  const lh = (value: number) => Math.round(value * fontScale)

  return StyleSheet.create({
    app: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    loadingScreen: {
      alignItems: 'center',
      gap: 14,
      justifyContent: 'center',
    },
    gradient: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    screen: {
      paddingHorizontal: 22,
      paddingTop: 26,
    },
    header: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 18,
      justifyContent: 'space-between',
      marginBottom: 26,
    },
    headerCopy: {
      flex: 1,
    },
    eyebrow: {
      color: theme.muted,
      fontFamily,
      fontSize: fs(12),
      fontWeight: '800',
      letterSpacing: 1.1,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    heroTitle: {
      color: theme.text,
      fontFamily,
      fontSize: fs(48),
      fontWeight: '800',
      letterSpacing: 0,
      lineHeight: lh(52),
    },
    subcopy: {
      color: theme.muted,
      fontFamily,
      fontSize: fs(14),
      marginTop: 11,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: theme.accentSoft,
      borderColor: theme.accent,
      borderRadius: 30,
      borderWidth: 1,
      height: 58,
      justifyContent: 'center',
      width: 58,
    },
    avatarText: {
      fontFamily,
      fontSize: fs(27),
      fontWeight: '800',
    },
    searchBar: {
      alignItems: 'center',
      backgroundColor: theme.surfaceStrong,
      borderColor: theme.border,
      borderRadius: 28,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      minHeight: 66,
      marginBottom: 32,
      paddingHorizontal: 16,
    },
    searchInput: {
      color: theme.text,
      flex: 1,
      fontFamily,
      fontSize: fs(16),
      minWidth: 0,
    },
    searchIconButton: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 16,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
    stack: {
      gap: 34,
    },
    metricsGrid: {
      flexDirection: 'row',
      gap: 14,
    },
    metricCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 26,
      borderWidth: 1,
      flex: 1,
      padding: 18,
    },
    metricValue: {
      color: theme.text,
      fontFamily,
      fontSize: fs(29),
      fontWeight: '800',
      marginTop: 6,
    },
    sectionTitle: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 17,
    },
    sectionHeading: {
      color: theme.text,
      fontFamily,
      fontSize: fs(24),
      fontWeight: '800',
      lineHeight: lh(28),
    },
    sectionAction: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 2,
    },
    sectionActionText: {
      fontFamily,
      fontSize: fs(15),
      fontWeight: '800',
    },
    projectRail: {
      gap: 16,
      paddingRight: 22,
    },
    projectList: {
      gap: 14,
    },
    projectCard: {
      borderColor: theme.border,
      borderRadius: 28,
      borderWidth: 1,
      minHeight: 178,
      overflow: 'hidden',
      padding: 20,
      width: 282,
    },
    projectCardLarge: {
      minHeight: 188,
      width: '100%',
    },
    projectTopline: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 22,
    },
    projectMark: {
      borderRadius: 7,
      height: 13,
      width: 13,
    },
    projectTitle: {
      color: theme.text,
      fontFamily,
      fontSize: fs(22),
      fontWeight: '800',
      marginBottom: 8,
    },
    cardMuted: {
      color: theme.muted,
      fontFamily,
      fontSize: fs(13),
      lineHeight: lh(18),
    },
    progressRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
      marginTop: 24,
    },
    progressTrack: {
      backgroundColor: theme.surfaceStrong,
      borderRadius: 99,
      flex: 1,
      height: 8,
      overflow: 'hidden',
    },
    progressFill: {
      borderRadius: 99,
      height: 8,
    },
    progressText: {
      color: theme.text,
      fontFamily,
      fontSize: fs(13),
      fontWeight: '800',
    },
    taskList: {
      gap: 14,
    },
    taskCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 13,
      padding: 16,
    },
    taskTopRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 14,
    },
    taskDone: {
      opacity: 0.64,
    },
    taskCheck: {
      alignItems: 'center',
      backgroundColor: theme.accentSoft,
      borderColor: theme.accent,
      borderRadius: 19,
      borderWidth: 2,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
    taskBody: {
      flex: 1,
      minWidth: 0,
    },
    taskHeading: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    taskTitle: {
      color: theme.text,
      flex: 1,
      fontFamily,
      fontSize: fs(15),
      fontWeight: '800',
      lineHeight: lh(20),
    },
    taskTitleDone: {
      textDecorationLine: 'line-through',
    },
    taskDescription: {
      color: theme.muted,
      fontFamily,
      fontSize: fs(13),
      lineHeight: lh(18),
      marginTop: 8,
    },
    taskMeta: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 10,
    },
    metaText: {
      color: theme.soft,
      fontFamily,
      fontSize: fs(12),
      marginRight: 6,
    },
    iconButton: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 16,
      height: 34,
      justifyContent: 'center',
      width: 34,
    },
    taskImage: {
      borderRadius: 18,
      height: 150,
      width: '100%',
    },
    mediaActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    mediaBadge: {
      alignItems: 'center',
      backgroundColor: theme.accentSoft,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },
    mediaBadgeText: {
      color: theme.accent,
      fontFamily,
      fontSize: fs(12),
      fontWeight: '800',
    },
    priority: {
      borderRadius: 99,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    priorityText: {
      fontFamily,
      fontSize: fs(10),
      fontWeight: '800',
    },
    priorityHigh: {
      backgroundColor: 'rgba(255,122,138,0.14)',
    },
    priorityHighText: {
      color: '#ff7a8a',
    },
    priorityMid: {
      backgroundColor: 'rgba(242,191,101,0.14)',
    },
    priorityMidText: {
      color: '#f2bf65',
    },
    priorityLow: {
      backgroundColor: 'rgba(99,216,173,0.14)',
    },
    priorityLowText: {
      color: '#63d8ad',
    },
    emptyState: {
      alignItems: 'center',
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 13,
      justifyContent: 'center',
      minHeight: 160,
      padding: 24,
    },
    weekStrip: {
      flexDirection: 'row',
      gap: 8,
    },
    dayPill: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 21,
      borderWidth: 1,
      flex: 1,
      gap: 5,
      minHeight: 72,
      justifyContent: 'center',
    },
    dayPillActive: {
      backgroundColor: theme.accentSoft,
      borderColor: theme.accent,
    },
    dayLabel: {
      color: theme.muted,
      fontFamily,
      fontSize: fs(11),
      fontWeight: '700',
    },
    dayNumber: {
      color: theme.text,
      fontFamily,
      fontSize: fs(17),
      fontWeight: '800',
    },
    panel: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 26,
      borderWidth: 1,
      padding: 17,
    },
    scheduleHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    panelTitle: {
      color: theme.text,
      fontFamily,
      fontSize: fs(15),
      fontWeight: '800',
    },
    courseList: {
      gap: 14,
    },
    courseCard: {
      alignItems: 'center',
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 24,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 14,
      padding: 17,
    },
    courseIcon: {
      alignItems: 'center',
      backgroundColor: theme.accentSoft,
      borderRadius: 16,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    courseTitle: {
      color: theme.text,
      fontFamily,
      fontSize: fs(15),
      fontWeight: '800',
      marginBottom: 4,
    },
    accessibilityIconText: {
      color: theme.accent,
      fontFamily,
      fontSize: fs(17),
      fontWeight: '800',
    },
    settingsCard: {
      alignItems: 'center',
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 26,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 14,
      padding: 17,
    },
    settingsCopy: {
      flex: 1,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    segmentButton: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 17,
      borderWidth: 1,
      flex: 1,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 8,
    },
    segmentButtonActive: {
      backgroundColor: theme.accentSoft,
      borderColor: theme.accent,
    },
    segmentText: {
      color: theme.muted,
      fontFamily,
      fontSize: fs(12),
      fontWeight: '800',
      textAlign: 'center',
    },
    assistantCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 26,
      borderWidth: 1,
      gap: 14,
      padding: 17,
    },
    assistantHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 14,
    },
    assistantInputRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    assistantInput: {
      backgroundColor: theme.surfaceStrong,
      borderColor: theme.border,
      borderRadius: 17,
      borderWidth: 1,
      color: theme.text,
      flex: 1,
      fontFamily,
      fontSize: fs(14),
      minHeight: 48,
      paddingHorizontal: 14,
    },
    sendButton: {
      alignItems: 'center',
      backgroundColor: theme.accent,
      borderRadius: 17,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    assistantAnswer: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 18,
      borderWidth: 1,
      color: theme.text,
      fontFamily,
      fontSize: fs(13),
      lineHeight: lh(19),
      padding: 13,
    },
    quickCommandGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quickCommand: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 9,
    },
    quickCommandText: {
      color: theme.muted,
      fontFamily,
      fontSize: fs(12),
      fontWeight: '800',
    },
    assistantVoiceRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    voiceAction: {
      alignItems: 'center',
      backgroundColor: theme.accentSoft,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },
    infoPanel: {
      alignItems: 'flex-start',
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 26,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 14,
      padding: 17,
    },
    dangerAction: {
      alignItems: 'center',
      backgroundColor: 'rgba(255,122,138,0.12)',
      borderColor: 'rgba(255,122,138,0.25)',
      borderRadius: 20,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 9,
      justifyContent: 'center',
      minHeight: 52,
    },
    dangerActionText: {
      color: '#ff7a8a',
      fontFamily,
      fontSize: fs(14),
      fontWeight: '800',
    },
    bottomTabs: {
      backgroundColor: theme.tab,
      borderColor: theme.border,
      borderTopWidth: 1,
      bottom: 0,
      flexDirection: 'row',
      left: 0,
      paddingHorizontal: 12,
      paddingTop: 10,
      position: 'absolute',
      right: 0,
    },
    tabButton: {
      alignItems: 'center',
      flex: 1,
      gap: 6,
      justifyContent: 'center',
    },
    tabIconWrap: {
      alignItems: 'center',
      borderRadius: 19,
      height: 38,
      justifyContent: 'center',
      width: 46,
    },
    tabIconActive: {
      backgroundColor: theme.accentSoft,
    },
    tabText: {
      color: theme.muted,
      fontFamily,
      fontSize: fs(12),
      fontWeight: '800',
    },
    fab: {
      alignItems: 'center',
      backgroundColor: theme.accent,
      borderRadius: 33,
      height: 66,
      justifyContent: 'center',
      position: 'absolute',
      right: 19,
      shadowColor: theme.accent,
      shadowOpacity: 0.25,
      shadowRadius: 18,
      width: 66,
    },
    modalBackdrop: {
      backgroundColor: 'rgba(0,0,0,0.58)',
      flex: 1,
    },
    modalScroll: {
      flexGrow: 1,
      justifyContent: 'flex-end',
      padding: 18,
    },
    modalCard: {
      backgroundColor: theme.bg,
      borderColor: theme.border,
      borderRadius: 30,
      borderWidth: 1,
      gap: 15,
      padding: 22,
    },
    modalHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalTitle: {
      color: theme.text,
      fontFamily,
      fontSize: fs(24),
      fontWeight: '800',
    },
    field: {
      backgroundColor: theme.surfaceStrong,
      borderColor: theme.border,
      borderRadius: 17,
      borderWidth: 1,
      color: theme.text,
      fontFamily,
      fontSize: fs(15),
      minHeight: 50,
      paddingHorizontal: 14,
    },
    textArea: {
      minHeight: 82,
      paddingTop: 13,
      textAlignVertical: 'top',
    },
    formLabel: {
      color: theme.muted,
      fontFamily,
      fontSize: fs(12),
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    formRow: {
      flexDirection: 'row',
      gap: 10,
    },
    formColumn: {
      flex: 1,
      gap: 8,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    chipActive: {
      backgroundColor: theme.accentSoft,
      borderColor: theme.accent,
    },
    chipText: {
      color: theme.muted,
      fontFamily,
      fontSize: fs(12),
      fontWeight: '800',
    },
    attachmentRow: {
      flexDirection: 'row',
      gap: 9,
    },
    attachmentButton: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      justifyContent: 'center',
      minHeight: 48,
    },
    previewImage: {
      borderRadius: 18,
      height: 170,
      width: '100%',
    },
    detailImage: {
      borderRadius: 22,
      height: 220,
      width: '100%',
    },
    detailInfoBox: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 4,
      padding: 13,
    },
    audioSaved: {
      alignItems: 'center',
      backgroundColor: theme.accentSoft,
      borderRadius: 16,
      flexDirection: 'row',
      gap: 8,
      padding: 12,
    },
    swatchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    swatch: {
      borderColor: theme.border,
      borderRadius: 17,
      borderWidth: 1,
      height: 34,
      width: 34,
    },
    swatchActive: {
      borderColor: theme.text,
      borderWidth: 3,
    },
    subtaskList: {
      gap: 10,
    },
    subtaskRow: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      padding: 10,
    },
    subtaskText: {
      color: theme.text,
      flex: 1,
      fontFamily,
      fontSize: fs(14),
      fontWeight: '800',
      lineHeight: lh(19),
    },
    primaryAction: {
      alignItems: 'center',
      backgroundColor: theme.accent,
      borderRadius: 18,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      minHeight: 52,
    },
    primaryActionText: {
      color: '#041113',
      fontFamily,
      fontSize: fs(15),
      fontWeight: '800',
    },
  })
}

