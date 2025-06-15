import { useRef, useState, useEffect } from "react";
import { FiChevronDown, FiChevronUp, FiMessageSquare } from "react-icons/fi";
import io from "socket.io-client";
import { ScheduleTimeLine } from "./ScheduleTimeline";

const BACKEND_URL = "http://localhost:5001";

export const UI = () => {
  const [visible, setVisible] = useState(true);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("Global");
  const [globalMessages, setGlobalMessages] = useState([]);
  const [localMessages, setLocalMessages] = useState([]);
  const textareaRef = useRef(null);
  const chatRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [sid, setSid] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [schedulerOpen, setSchedulerOpen] = useState(false);

  const [inputText, setInputText] = useState("");
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const socket = io(`http://localhost:5000`, {
      query: {
        user_id: "localuser"
      }
    });
    
    setSocket(socket);
    socket.on("connect", () => {
      console.log("Connected to socket server.");
    });

    // 🔔 Listen for custom server event
    socket.on("server_response", (data) => {
      console.log("Received server response:", data);
    });

    // Clean up socket on unmount
    return () => socket.disconnect();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed) {
        if (mode === "Global") {
          setGlobalMessages((prev) => [...prev, trimmed]);
          setInputText(trimmed);
          handleAudioSubmit();
        } else {
          setLocalMessages((prev) => [...prev, trimmed]);
          const messageToSend = { text: trimmed, image: "None", sender: userId, conversation_id: selectedConversation };
          socket.current.emit('client_event', messageToSend);
          setInputText(trimmed);
          handleAudioSubmit();
        }
        setInput("");
        textareaRef.current?.blur();
      }
    }
  };
  const handleAudioSubmit = async () => {

    setLoading(true);
    setJobId(null);
    setStatus("pending");

    try {
      // Send text to backend
      const res = await fetch(`${BACKEND_URL}/generate_tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit TTS job");
      }

      const { job_id } = await res.json();
      setJobId(job_id);

      // Poll backend for job completion
      while (true) {
        const statusRes = await fetch(`${BACKEND_URL}/get_tts/${job_id}`);

        if (!statusRes.ok) {
          throw new Error("Error fetching job status");
        }

        const contentType = statusRes.headers.get("Content-Type");

        if (contentType.includes("application/json")) {
          const data = await statusRes.json();
          if (data.status === "done") {
            setStatus("done");
            break;
          } else if (data.status === "error") {
            setStatus("error");
            alert("Error: " + data.message);
            break;
          } else {
            setStatus(data.status);
          }
        } else {
          // If MP3 file streamed directly (edge case fallback)
          setStatus("done");
          break;
        }

        await new Promise((r) => setTimeout(r, 1000)); // Wait 1 second before rechecking
      }
    } catch (err) {
      alert("TTS error: " + err.message);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };
  const toggleMode = () => {
    setMode((prev) => (prev === "Global" ? "Local" : "Global"));
  };

  // Focus textarea on "/" key
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.key === "/") {
        e.preventDefault();
        setVisible(true);
        setTimeout(() => textareaRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [globalMessages, localMessages, mode]);

  const messagesToRender = mode === "Global" ? globalMessages : localMessages;

  return (
    <section className="fixed inset-0 z-10 pointer-events-none">
      <div className="absolute top-4 left-4 w-72 md:w-96 pointer-events-auto">
        {/* Navbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-white/20 backdrop-blur-md text-white text-sm font-semibold rounded-t-lg border border-white/30">
          <div className="flex items-center gap-2">
            <FiMessageSquare className="text-lg" />
            <span>Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMode}
              className="px-2 py-0.5 text-xs bg-white/10 border border-white/30 rounded hover:bg-white/20 transition-colors"
            >
              {mode === "Global" ? "🌐 Global" : "🏠 Local"}
            </button>
            <button
              onClick={() => setVisible(!visible)}
              className="hover:text-red-400 transition-colors"
            >
              {visible ? (
                <FiChevronUp className="text-xl" />
              ) : (
                <FiChevronDown className="text-xl" />
              )}
            </button>
          </div>
        </div>
        
        {/* Chat Content */}
        {visible && (
          <div className="h-60 bg-white/10 backdrop-blur-md border border-t-0 border-white/30 rounded-b-lg p-2 flex flex-col justify-between">
            <div
              ref={chatRef}
              className="h-40 overflow-y-auto space-y-1 pr-1"
            >
              {messagesToRender.map((msg, i) => (
                <div
                  key={i}
                  className="text-white text-sm p-1 bg-white/10 rounded w-fit break-words"
                >
                  {msg}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="h-12 resize-none bg-transparent outline-none text-white text-sm placeholder-white/60"
              placeholder={`Type your ${mode.toLowerCase()} message...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        )}
      </div>
	  
	  {/* Subtitles at bottom center */}
      <div className="absolute bottom-30 left-1/2 transform -translate-x-1/2 px-2 text-white text-2xl font-semibold pointer-events-auto">
        This is your subtitle text.
      </div>
      
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2 pointer-events-auto">
      <button
        onClick={() => setSchedulerOpen(!schedulerOpen)}
        className="bg-white/20 text-white px-3 py-2 rounded-lg border border-white/30 hover:bg-white/30 transition-colors"
      >
        Scheduler
      </button>
    </div>

    <div className="pointer-events-auto">
      <div className={schedulerOpen ? 'block' : 'hidden'}>
        <ScheduleTimeLine />
      </div>
    </div>
    
    {status === "done" && jobId && (
	  <div style={{ marginTop: 20 }}>
		<audio
		  autoPlay
		  src={`${BACKEND_URL}/get_tts/${jobId}`}
		  style={{ display: "none" }}
		/>
	  </div>
	)}

    </section>
  );
};
