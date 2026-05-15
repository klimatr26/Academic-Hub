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
import { StatusBar } from 'expo-status-bar'
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
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image as RNImage,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'

type Tab = 'home' | 'calendar' | 'projects' | 'settings'
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
  progress: number
  accent: string
}

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

const courses = [
  'Gestion de Proyectos',
  'Base de Datos',
  'Interaccion Humano-Computador',
  'Investigacion',
  'Matematicas',
]

const weekLabels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

const projects: Project[] = [
  {
    id: 'projectx',
    title: 'ProjectX',
    course: 'Interaccion Humano-Computador',
    due: 'Entrega parcial',
    progress: 72,
    accent: '#5dd6cf',
  },
  {
    id: 'capm',
    title: 'Certificacion CAPM',
    course: 'Preparacion profesional',
    due: 'Simulacro viernes',
    progress: 46,
    accent: '#8bb7ff',
  },
]

const dbName = 'academic_hub.db'
const mediaFolder = `${FileSystem.documentDirectory ?? ''}academic-hub-media/`
const fontScales: FontScale[] = [1, 1.15, 1.3]

const formatIso = (date: Date) => date.toISOString().slice(0, 10)

const offsetDate = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return formatIso(date)
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

const starterTasks = (): Task[] => [
  {
    id: makeId(),
    title: 'Aprobar cronograma de Activate',
    description: 'Revisar fechas, responsables y entregables antes de enviarlo.',
    course: 'Gestion de Proyectos',
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
    title: 'Grabar resumen de metodologia',
    description: 'Explicar hallazgos principales de la prueba de usabilidad.',
    course: 'Investigacion',
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

function getCourseFromText(normalized: string) {
  return courses.find((item) => normalized.includes(normalizeText(item))) ?? courses[0]
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

function summarizeWorkload(tasks: Task[]) {
  const pending = tasks.filter((task) => !task.done)
  const byCourse = courses
    .map((course) => {
      const count = pending.filter((task) => task.course === course).length
      return count > 0 ? `${course}: ${count}` : null
    })
    .filter(Boolean)

  if (!pending.length) return 'No hay tareas pendientes registradas.'
  return `Tienes ${pending.length} pendientes. Carga por materia:\n${byCourse.join('\n')}`
}

function runLocalAssistant(question: string, tasks: Task[]): AssistantResult {
  const normalized = normalizeText(question)
  const wantsCreate =
    /^(crea|crear|agrega|agregar|anade|añade|nueva)\s+(una\s+)?(tarea|actividad|deber)/i.test(
      question.trim(),
    )

  if (normalized.includes('que puedes hacer') || normalized.includes('ayuda')) {
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
      course: getCourseFromText(normalized),
      date: getDateFromQuestion(question) ?? formatIso(new Date()),
      time: getTimeFromText(question),
      priority: getPriorityFromText(normalized),
      reminder: true,
      imageUri: null,
      audioUri: null,
    }

    return {
      answer: `Listo, cree la tarea "${taskDraft.title}" para ${taskDraft.date} a las ${taskDraft.time}.`,
      taskDraft,
    }
  }

  if (normalized.includes('plan') || normalized.includes('organiza') || normalized.includes('prioriza')) {
    return { answer: buildPlan(tasks) }
  }

  if (normalized.includes('resumen') || normalized.includes('carga') || normalized.includes('materias')) {
    return { answer: summarizeWorkload(tasks) }
  }

  const onlyPending = !normalized.includes('completad')
  const date = getDateFromQuestion(question)

  let matches = tasks.filter((task) => (onlyPending ? !task.done : true))

  if (date) {
    matches = matches.filter((task) => task.date === date)
  }

  const course = courses.find((item) => normalized.includes(normalizeText(item)))
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

  if (normalized.includes('cuantas') || normalized.includes('cuantos')) {
    return { answer: `Tienes ${matches.length} actividad${matches.length === 1 ? '' : 'es'} que coinciden con eso.` }
  }

  if (!matches.length) {
    return {
      answer: date
        ? `No encontre tareas pendientes para ${date}.`
        : 'No encontre tareas con esos filtros. Puedes preguntar: "que deber tengo para el martes", "plan de estudio" o "agrega tarea estudiar SQL para mañana a las 18:30".',
    }
  }

  const header = date
    ? `Para ${date} tienes ${matches.length} actividad${matches.length === 1 ? '' : 'es'}:`
    : `Encontre ${matches.length} actividad${matches.length === 1 ? '' : 'es'}:`

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
  return `${task.title}. Materia: ${task.course}. Fecha: ${task.date}, hora ${task.time}. Prioridad ${task.priority}. ${task.description || 'Sin descripcion.'}`
}

export default function App() {
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null)
  const activePlayerRef = useRef<AudioPlayer | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [themeName, setThemeName] = useState<ThemeName>('dark')
  const [fontScale, setFontScale] = useState<FontScale>(1)
  const [voiceMode, setVoiceMode] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [query, setQuery] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(formatIso(new Date()))
  const [isReady, setIsReady] = useState(false)
  const theme = themes[themeName]
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

      if (!mounted) return
      setTasks(nextTasks)
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

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return tasks.filter((task) =>
      normalized ? `${task.title} ${task.course} ${task.description}`.toLowerCase().includes(normalized) : true,
    )
  }, [query, tasks])

  const todayTasks = filteredTasks.filter((task) => task.date === today)
  const pendingCount = tasks.filter((task) => !task.done).length
  const completedCount = tasks.filter((task) => task.done).length
  const audioCount = tasks.filter((task) => task.audioUri).length
  const imageCount = tasks.filter((task) => task.imageUri).length
  const selectedTask = selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) ?? null : null

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
    Alert.alert('Eliminar tarea', `Se eliminara "${task.title}".`, [
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
    Alert.alert('Reiniciar datos', 'Esto borrara tareas guardadas y cargara datos de ejemplo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reiniciar',
        style: 'destructive',
        onPress: async () => {
          const db = dbRef.current
          if (!db) return
          await db.runAsync('DELETE FROM tasks;')
          for (const task of starterTasks()) {
            await insertTask(db, task)
          }
          await refreshTasks()
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
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <LinearGradient
        colors={themeName === 'dark' ? ['#08353b', theme.bg] : ['#d8f1f5', theme.bg]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.screen}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Header pendingCount={pendingCount} styles={styles} theme={theme} />
            <SearchBar query={query} setQuery={setQuery} styles={styles} theme={theme} />

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
                allTasks={tasks}
                voiceMode={voiceMode}
                onAssistantCreateTask={addTask}
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
              <ProjectsView styles={styles} tasks={tasks} theme={theme} />
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
          </ScrollView>

          <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
            <Plus color="#041113" size={32} strokeWidth={2.5} />
          </Pressable>

          <BottomTabs activeTab={activeTab} setActiveTab={setActiveTab} styles={styles} theme={theme} />
        </SafeAreaView>
      </LinearGradient>

      <TaskModal
        defaultDate={today}
        onClose={() => setModalVisible(false)}
        onSubmit={addTask}
        styles={styles}
        theme={theme}
        visible={modalVisible}
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
        <Text style={styles.eyebrow}>Buenos dias</Text>
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
  query,
  setQuery,
  styles,
  theme,
}: {
  query: string
  setQuery: (value: string) => void
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
      />
      <Mic color={theme.muted} size={24} />
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
  allTasks,
  voiceMode,
  onAssistantCreateTask,
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
  allTasks: Task[]
  voiceMode: boolean
  onAssistantCreateTask: (task: TaskDraft) => Promise<void>
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.metricsGrid}>
        <MetricCard label="Pendientes" value={pendingCount} styles={styles} />
        <MetricCard label="Completadas" value={completedCount} styles={styles} />
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard label="Imagenes" value={imageCount} styles={styles} />
        <MetricCard label="Notas de voz" value={audioCount} styles={styles} />
      </View>

      <View>
        <LocalAssistant
          styles={styles}
          tasks={allTasks}
          theme={theme}
          voiceMode={voiceMode}
          onCreateTask={onAssistantCreateTask}
        />
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
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} styles={styles} theme={theme} />
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
  styles,
  tasks,
  theme,
}: {
  styles: ReturnType<typeof createStyles>
  tasks: Task[]
  theme: Theme
}) {
  return (
    <View style={styles.stack}>
      <View>
        <SectionTitle styles={styles} theme={theme} title="Proyectos" />
        <View style={styles.projectList}>
          {projects.map((project) => (
            <ProjectCard key={project.id} large project={project} styles={styles} theme={theme} />
          ))}
        </View>
      </View>

      <View>
        <SectionTitle styles={styles} theme={theme} title="Carga por asignatura" />
        <View style={styles.courseList}>
          {courses.map((course) => {
            const amount = tasks.filter((task) => task.course === course && !task.done).length
            return (
              <View key={course} style={styles.courseCard}>
                <View style={styles.courseIcon}>
                  <BookOpen color={theme.accent} size={19} />
                </View>
                <View>
                  <Text style={styles.courseTitle}>{course}</Text>
                  <Text style={styles.cardMuted}>{amount} pendientes</Text>
                </View>
              </View>
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
              {isDark ? 'Oscuro elegante con cian mate' : 'Claro limpio para estudiar de dia'}
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
            <Text style={styles.courseTitle}>Tamano de letra</Text>
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
            Guarda tareas, estado, imagenes, notas de voz y tema en SQLite del dispositivo.
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

function LocalAssistant({
  styles,
  tasks,
  theme,
  voiceMode,
  onCreateTask,
}: {
  styles: ReturnType<typeof createStyles>
  tasks: Task[]
  theme: Theme
  voiceMode: boolean
  onCreateTask: (task: TaskDraft) => Promise<void>
}) {
  const [question, setQuestion] = useState('Que deber tengo para el martes?')
  const [answer, setAnswer] = useState(
    'Soy un asistente local: respondo usando tus tareas guardadas en SQLite, sin internet.',
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
    await handleResult(runLocalAssistant(question, tasks))
  }

  const quickQuestions = [
    'Que deber tengo hoy?',
    'Que deber tengo para el martes?',
    'Plan de estudio',
    'Resumen de carga',
    'Tareas urgentes',
    'Agrega tarea leer capitulo para mañana a las 18:30 prioridad media',
  ]

  return (
    <View style={styles.assistantCard}>
      <View style={styles.assistantHeader}>
        <View style={styles.courseIcon}>
          <Bot color={theme.accent} size={21} />
        </View>
        <View style={styles.settingsCopy}>
          <Text style={styles.courseTitle}>Asistente local</Text>
          <Text style={styles.cardMuted}>Pregunta por dias, materias, audios, imagenes o pendientes.</Text>
        </View>
      </View>
      <View style={styles.assistantInputRow}>
        <TextInput
          placeholder="Ej. que deber tengo para el martes"
          placeholderTextColor={theme.muted}
          style={styles.assistantInput}
          value={question}
          onChangeText={setQuestion}
        />
        <Pressable style={styles.sendButton} onPress={ask}>
          <Send color="#041113" size={18} />
        </Pressable>
      </View>
      <View style={styles.quickCommandGrid}>
        {quickQuestions.map((item) => (
          <Pressable
            key={item}
            style={styles.quickCommand}
            onPress={async () => {
              const result = runLocalAssistant(item, tasks)
              setQuestion(item)
              await handleResult(result)
            }}
          >
            <Text style={styles.quickCommandText}>{item}</Text>
          </Pressable>
        ))}
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
    </View>
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
      Alert.alert('Falta el titulo', 'La actividad necesita un titulo.')
      return
    }

    onSave({
      ...task,
      title: title.trim(),
      description: description.trim(),
      date: date.trim() || task.date,
      time: time.trim() || task.time,
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

            <Text style={styles.formLabel}>Titulo</Text>
            <TextInput style={styles.field} value={title} onChangeText={setTitle} />

            <Text style={styles.formLabel}>Descripcion</Text>
            <TextInput
              multiline
              style={[styles.field, styles.textArea]}
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Fecha</Text>
                <TextInput style={styles.field} value={date} onChangeText={setDate} />
              </View>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Hora</Text>
                <TextInput style={styles.field} value={time} onChangeText={setTime} />
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
                Estado: {task.done ? 'Completada' : 'Pendiente'} | Recordatorio: {task.reminder ? 'Si' : 'No'}
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
  defaultDate,
  onClose,
  onSubmit,
  styles,
  theme,
  visible,
}: {
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
  const [course, setCourse] = useState(courses[0])
  const [priority, setPriority] = useState<Priority>('Media')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('08:00')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [isSavingMedia, setIsSavingMedia] = useState(false)

  useEffect(() => {
    if (visible) setDate(defaultDate)
  }, [defaultDate, visible])

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Activa el permiso de galeria para adjuntar imagenes.')
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
      Alert.alert('Permiso requerido', 'Activa el microfono para grabar notas de voz.')
      return
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await recorder.prepareToRecordAsync()
    recorder.record()
  }

  const submit = () => {
    if (!title.trim()) {
      Alert.alert('Falta el titulo', 'Escribe un titulo corto para guardar la tarea.')
      return
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      course,
      date: date.trim() || defaultDate,
      time: time.trim() || '08:00',
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
              placeholder="Descripcion, enlaces o notas importantes"
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
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.muted}
                  style={styles.field}
                  value={date}
                  onChangeText={setDate}
                />
              </View>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Hora</Text>
                <TextInput
                  placeholder="HH:mm"
                  placeholderTextColor={theme.muted}
                  style={styles.field}
                  value={time}
                  onChangeText={setTime}
                />
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
  project,
  styles,
  theme,
}: {
  large?: boolean
  project: Project
  styles: ReturnType<typeof createStyles>
  theme: Theme
}) {
  return (
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
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${project.progress}%`, backgroundColor: project.accent },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{project.progress}%</Text>
      </View>
      <Text style={styles.cardMuted}>{project.due}</Text>
    </LinearGradient>
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
  const items = [
    { id: 'home' as const, label: 'Inicio', icon: Home },
    { id: 'calendar' as const, label: 'Calendario', icon: CalendarDays },
    { id: 'projects' as const, label: 'Proyectos', icon: LayoutGrid },
    { id: 'settings' as const, label: 'Ajustes', icon: Settings },
  ]

  return (
    <View style={styles.bottomTabs}>
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
      paddingBottom: 132,
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
      height: 102,
      left: 0,
      paddingBottom: 16,
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
      bottom: 121,
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

