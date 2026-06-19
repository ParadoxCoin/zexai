import { Terminal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const TerminalEasterEgg: React.FC = () => {
    const { i18n } = useTranslation();
    const currentLang = i18n.language || 'en';

    const [isHacked, setIsHacked] = useState(false);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<{type: 'command' | 'output', text: string}[]>([]);
    
    // Localized Terminal Content
    const terminalDict: Record<string, any> = {
        tr: {
            init: "ZexAI Ana Bilgisayarına Bağlanıldı...\nYetkilendirme başlatılıyor...\nHoş geldin, Kurucu.\n\n(Yardım için 'help' yazın)",
            help: "Kullanılabilir komutlar:\n- airdrop  : Gizli $ZEX airdrop havuzu\n- robot    : Unitree G1 kontrol protokolü\n- delilik  : Sistem delilik analizi\n- clear    : Ekranı temizle\n- exit     : Terminali kapat",
            airdrop: "Metamask cüzdanınıza 10.000 $ZEX gönderiliyor...\n[################........]\n[HATA]: Cüzdan reddedildi! Tabii ki bedava ZEX yok, ana sayfadan Presale sekmesine tıkla dostum ;)",
            robot: "Fiziksel robotlara bağlanılıyor...\nIP: 192.168.1.144\n[UYARI]: Hedef robot şu an uyku modunda. Uyandırmak için ZexAI Web3 SDK protokolünü kullanın.",
            insanity: "Delilik seviyesi: %99.9!\nGörünüşe göre asıl deli biziz dostum! :)) ZexAI Ekosistemine hoş geldin. Matrix'i birlikte baştan yazıyoruz.",
            sudo: "Bu yetkiye sadece Kurucu sahip. Sisteme girmeye çalışman loglandı!",
            notfound: "Komut bulunamadı: {cmd}. 'help' yazarak komut listesini görebilirsiniz."
        },
        en: {
            init: "Connected to ZexAI Mainframe...\nInitiating authorization...\nWelcome, Founder.\n\n(Type 'help' for assistance)",
            help: "Available commands:\n- airdrop  : Secret $ZEX airdrop pool\n- robot    : Unitree G1 control protocol\n- insanity : System insanity analysis\n- clear    : Clear screen\n- exit     : Close terminal",
            airdrop: "Sending 10,000 $ZEX to your wallet...\n[################........]\n[ERROR]: Wallet rejected! No free ZEX here, check the Presale tab buddy ;)",
            robot: "Connecting to robots...\nIP: 192.168.1.144\n[WARNING]: Target robot is in sleep mode. Use ZexAI SDK to wake up.",
            insanity: "Insanity level: 99.9%!\nLooks like we are the crazy ones! :)) Welcome to ZexAI. Rewriting the Matrix together.",
            sudo: "Only the Founder has this authority. Access attempt logged!",
            notfound: "Command not found: {cmd}. Type 'help' for assistance."
        },
        ru: {
            init: "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043A \u043C\u0435\u0439\u043D\u0444\u0440\u0435\u0439\u043C\u0443 ZexAI...\n\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F...\n\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C, \u041E\u0441\u043D\u043E\u0432\u0430\u0442\u0435\u043B\u044C.\n\n(\u0412\u0432\u0435\u0434\u0438\u0442\u0435 'help' \u0434\u043B\u044F \u043F\u043E\u043C\u043E\u0449\u0438)",
            help: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B:\n- airdrop  : \u0421\u0435\u043A\u0440\u0435\u0442\u043D\u044B\u0439 airdrop $ZEX\n- robot    : \u041F\u0440\u043E\u0442\u043E\u043A\u043E\u043B \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F Unitree G1\n- insanity : \u0410\u043D\u0430\u043B\u0438\u0437 \u0431\u0435\u0437\u0443\u043C\u0438\u044F \u0441\u0438\u0441\u0442\u0435\u043C\u044B\n- clear    : \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u044D\u043A\u0440\u0430\u043D\n- exit     : \u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043B",
            airdrop: "\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 10 000 $ZEX...\n[################........]\n[\u041E\u0428\u0418\u0411\u041A\u0410]: \u041A\u043E\u0448\u0435\u043B\u0435\u043A \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D! \u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E\u0433\u043E ZEX \u043D\u0435\u0442, \u0434\u0440\u0443\u0436\u0438\u0449\u0435 ;)",
            robot: "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043A \u0440\u043E\u0431\u043E\u0442\u0430\u043C...\nIP: 192.168.1.144\n[\u0412\u041D\u0418\u041C\u0410\u041D\u0418\u0415]: \u0420\u043E\u0431\u043E\u0442 \u0432 \u0440\u0435\u0436\u0438\u043C\u0435 \u0441\u043D\u0430.",
            insanity: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0431\u0435\u0437\u0443\u043C\u0438\u044F: 99.9%!\n\u041F\u043E\u0445\u043E\u0436\u0435, \u043C\u044B \u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0438\u0435 \u0431\u0435\u0437\u0443\u043C\u0446\u044B! \u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 ZexAI.",
            sudo: "\u0422\u043E\u043B\u044C\u043A\u043E \u041E\u0441\u043D\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0438\u043C\u0435\u0435\u0442 \u044D\u0442\u043E \u043F\u0440\u0430\u0432\u043E.",
            notfound: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430: {cmd}."
        },
        zh: {
            init: "\u5DF2\u8FDE\u63A5\u5230 ZexAI \u4E3B\u673A...\n\u6B63\u5728\u542F\u52A8\u6388\u6743...\n\u6B22\u8FCE\uFF0C\u521B\u59CB\u4EBA\u3002\n\n(\u8F93\u5165 'help' \u83B7\u53D6\u5E2E\u52A9)",
            help: "\u53EF\u7528\u547D\u4EE4\uFF1A\n- airdrop  : \u79D8\u5BC6 $ZEX \u7A7A\u6295\u6C60\n- robot    : Unitree G1 \u63A7\u5236\u534F\u8BAE\n- insanity : \u7CFB\u7EDF\u75AF\u72C2\u5206\u6790\n- clear    : \u6E05\u5C4F\n- exit     : \u5173\u95ED\u7EC8\u7AEF",
            airdrop: "\u6B63\u5728\u5411\u60A8\u7684\u94B1\u5305\u53D1\u9001 10,000 $ZEX...\n[################........]\n[\u9519\u8BEF]: \u94B1\u5305\u88AB\u62D2\u7EDD\uFF01\u8FD9\u91CC\u6CA1\u6709\u514D\u8D39\u7684 ZEX\uFF0C\u8BF7\u67E5\u770B\u4E3B\u9875\u7684 Presale \u9009\u9879\u5361\u3002",
            robot: "\u6B63\u5728\u8FDE\u63A5\u5230\u673A\u5668\u4EBA...\nIP: 192.168.1.144\n[\u8B66\u544A]: \u76EE\u6807\u673A\u5668\u4EBA\u5F53\u524D\u5904\u4E8E\u7761\u7720\u6A21\u5F0F\u3002",
            insanity: "\u75AF\u72C2\u7A0B\u5EA6\uFF1A99.9%\uFF01\n看来我们才是真正的疯子\uFF01\u6B22\u8FCE\u6765\u5230 ZexAI \u751F\u6001\u7CFB\u7EDF\u3002",
            sudo: "\u53EA\u6709\u521B\u59CB\u4EBA\u624D\u6709\u6B64\u6743\u9650\u3002\u8BBF\u95EE\u5DF2\u8BB0\u5F55\uFF01",
            notfound: "\u672A\u627E\u5230\u547D\u4EE4\uFF1A{cmd}\u3002"
        }
    };

    const strings = terminalDict[currentLang] || terminalDict['en'];

    // Keylogger for "Z-E-X"
    useEffect(() => {
        let sequence = '';
        const timeout = 3000;
        let timer: any;
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isHacked) return; 
            
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            clearTimeout(timer);
            
            sequence += e.key.toLowerCase();
            
            if (sequence.includes('zex')) {
                setIsHacked(true);
                setHistory([{ type: 'output', text: strings.init }]);
                sequence = '';
            }
            
            timer = setTimeout(() => {
                sequence = '';
            }, timeout);
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHacked]);

    const handleCommand = (e: React.FormEvent) => {
        e.preventDefault();
        const cmd = input.trim().toLowerCase();
        if (!cmd) return;
        
        const newHistory = [...history, { type: 'command', text: input }];
        
        if (cmd === 'help') {
            newHistory.push({ type: 'output', text: strings.help });
        } else if (cmd === 'airdrop') {
            newHistory.push({ type: 'output', text: strings.airdrop });
        } else if (cmd === 'robot') {
            newHistory.push({ type: 'output', text: strings.robot });
        } else if (cmd === 'clear') {
            setHistory([]);
            setInput('');
            return;
        } else if (cmd === 'exit') {
            setIsHacked(false);
            setHistory([]);
            setInput('');
            return;
        } else if (cmd === 'delilik' || cmd === 'insanity') {
            newHistory.push({ type: 'output', text: strings.insanity });
        } else if (cmd === 'sudo' || cmd.startsWith('sudo ')) {
            newHistory.push({ type: 'output', text: strings.sudo });
        } else {
            newHistory.push({ type: 'output', text: strings.notfound.replace('{cmd}', input) });
        }
        
        setHistory(newHistory);
        setInput('');
    };

    const endOfTerminal = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (endOfTerminal.current) {
            endOfTerminal.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history]);

    if (!isHacked) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/95 text-green-500 font-mono p-4 sm:p-8 flex flex-col items-center justify-center backdrop-blur-md transition-all duration-500">
            <div className="w-full max-w-4xl h-full max-h-[80vh] bg-black border border-green-500/30 rounded-lg shadow-[0_0_50px_rgba(34,197,94,0.2)] flex flex-col relative overflow-hidden animate-pulse-glow">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-green-500/30 bg-green-500/10">
                    <div className="flex items-center gap-2 text-green-400">
                        <Terminal className="w-5 h-5" />
                        <span className="text-sm font-bold tracking-widest mt-1">ZEXAI_SECURE_SHELL</span>
                    </div>
                    <button onClick={() => setIsHacked(false)} className="text-green-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm sm:text-base">
                    {history.map((line, idx) => (
                        <div key={idx} className={`${line.type === 'command' ? 'text-green-300 font-bold' : 'text-green-500 opacity-90'} whitespace-pre-wrap leading-relaxed`}>
                            {line.type === 'command' ? `C:\\ZexAI\\Root> ${line.text}` : line.text}
                        </div>
                    ))}
                    <div ref={endOfTerminal} />
                </div>
                
                {/* Input */}
                <form onSubmit={handleCommand} className="flex items-center gap-3 p-4 border-t border-green-500/30 bg-black/80">
                    <span className="text-green-400 font-bold">C:\ZexAI\Root&gt;</span>
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-green-500 placeholder-green-500/30 font-bold"
                        spellCheck="false"
                        autoComplete="off"
                        autoFocus
                    />
                </form>
            </div>
            
            <div className="absolute bottom-4 right-4 text-xs text-green-500/50 flex items-center gap-1">
                ZexAI Terminal v1.0.0 (Agentic Built)
            </div>
            <style>{`
                .animate-pulse-glow {
                    animation: glow 4s infinite alternate;
                }
                @keyframes glow {
                    0% { box-shadow: 0 0 20px rgba(34,197,94,0.1); }
                    100% { box-shadow: 0 0 50px rgba(34,197,94,0.3); }
                }
            `}</style>
        </div>
    );
};
