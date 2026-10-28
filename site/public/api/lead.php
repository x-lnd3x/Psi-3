<?php
// Приём заявок с сайта: отправляет заявку в Telegram и, если задан, во внешний webhook
// (например, будущему ИИ-агенту). Настройки лежат в config.php рядом с этим файлом.

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function reply(int $code, array $body): void {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    reply(405, ['ok' => false, 'error' => 'method']);
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    reply(500, ['ok' => false, 'error' => 'config']);
}
$config = require $configFile;

$raw = file_get_contents('php://input', false, null, 0, 20000);
$data = json_decode($raw ?: '', true);
if (!is_array($data)) {
    reply(400, ['ok' => false, 'error' => 'json']);
}

// Ловушка для ботов: настоящий человек это поле не заполняет
if (!empty($data['website'])) {
    reply(200, ['ok' => true]);
}

// Не больше 5 заявок в час с одного адреса
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/lead_rate_' . md5($ip);
$hits = array_filter(
    is_file($rateFile) ? (json_decode((string) file_get_contents($rateFile), true) ?: []) : [],
    fn($t) => $t > time() - 3600
);
if (count($hits) >= 5) {
    reply(429, ['ok' => false, 'error' => 'rate']);
}
$hits[] = time();
file_put_contents($rateFile, json_encode(array_values($hits)));

function clean($v, int $max = 300): string {
    $s = trim(is_string($v) ? $v : '');
    return mb_substr(strip_tags($s), 0, $max);
}

$lead = [
    'name' => clean($data['name'] ?? '', 80),
    'channel' => clean($data['channel'] ?? '', 20),
    'contact' => clean($data['contact'] ?? '', 80),
    'who' => clean($data['who'] ?? '', 20),
    'format' => clean($data['format'] ?? '', 20),
    'topics' => array_slice(array_map(fn($t) => clean($t, 60), is_array($data['topics'] ?? null) ? $data['topics'] : []), 0, 12),
    'date' => clean($data['date'] ?? '', 10),
    'time' => clean($data['time'] ?? '', 5),
    'comment' => clean($data['comment'] ?? '', 1500),
    'lang' => clean($data['lang'] ?? 'ru', 2),
    'page' => clean($data['page'] ?? '', 120),
    'consent' => !empty($data['consent']),
    'created_at' => date('c'),
];

if ($lead['name'] === '' || $lead['contact'] === '' || !$lead['consent']) {
    reply(422, ['ok' => false, 'error' => 'validation']);
}

$who = ['pair' => 'Пара', 'family' => 'Семья', 'self' => 'Индивидуально'][$lead['who']] ?? 'Не указано';
$format = ['intro' => 'Бесплатное знакомство 20 минут', 'session' => 'Консультация'][$lead['format']] ?? 'Не указано';
$channel = ['telegram' => 'Telegram', 'max' => 'MAX', 'whatsapp' => 'WhatsApp', 'phone' => 'Звонок'][$lead['channel']] ?? $lead['channel'];
$when = $lead['date'] ? date('d.m.Y', strtotime($lead['date'])) . ($lead['time'] ? ' в ' . $lead['time'] : '') . ' МСК' : 'Подобрать в переписке';

$h = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$text = "<b>Новая заявка с сайта</b>\n\n"
    . "<b>Имя:</b> {$h($lead['name'])}\n"
    . "<b>Связь:</b> {$h($channel)}, {$h($lead['contact'])}\n"
    . "<b>Для кого:</b> {$h($who)}\n"
    . "<b>Формат:</b> {$h($format)}\n"
    . "<b>Время:</b> {$h($when)}\n"
    . ($lead['topics'] ? "<b>Запрос:</b> {$h(implode(', ', $lead['topics']))}\n" : '')
    . ($lead['comment'] !== '' ? "\n<b>Комментарий:</b>\n{$h($lead['comment'])}\n" : '')
    . "\nЯзык сайта: {$h($lead['lang'])}";

function post_json(string $url, array $payload): bool {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $code >= 200 && $code < 300;
}

$sent = post_json(
    'https://api.telegram.org/bot' . $config['telegram_bot_token'] . '/sendMessage',
    ['chat_id' => $config['telegram_chat_id'], 'text' => $text, 'parse_mode' => 'HTML']
);

// Задел на автоматизацию: та же заявка в виде JSON уходит агенту или в n8n
if (!empty($config['webhook_url'])) {
    post_json($config['webhook_url'], ['type' => 'lead', 'lead' => $lead, 'secret' => $config['webhook_secret'] ?? '']);
}

if (!$sent) {
    reply(502, ['ok' => false, 'error' => 'telegram']);
}
reply(200, ['ok' => true]);
