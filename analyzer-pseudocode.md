# Feature: Record App Interactions

### Permissions:
- Website console
- HTML code
- Screen view and recording
- Mouse movements and clicks within our browser-in-browser noVNC instance

## Implementation:
- Websockets for our graphviz and browser in browser
- Docker desktop
- Browser-in-browser via noVNC that'll use docker to run on my macbook air with TigerVNC server.
- Graphviz for interactive flow charts that are filled in from our Gemini API calls and can also be modified by the user through our tools (add, modify, etc.)
- Realtime multimodal AI inference (via Gemini API)
- Drag/drop interface allowing the user to interact with Graphviz

##### I may have to clean up this pseudocode later, this is just a first draft

--- FRONTEND - ReactJSX ---

```
    def app.jsx():
        style="Page should look like it is apart of a scientific study. instead of emphasizing animations, engaging colors, complex components, and other trivial components, the actual user interface should be as simple as possible and seem scientific. Font should be Times New Roman, all math and/or algorithms should be formatted using LaTeX. Additionally, the source code should be well-documented and concise. Instead of deep-nested and complicated functions, everything should be coded so that it is easily accessible by other LLMs or researchers who want to fork the code."

        purpose="Our frontend is serving as an internal data collection tool that allows me (the researcher) to track my interactions with a website, namely Amazon. Our frontend will contain a browser-in-browser interface that allows me to navigate sites while also providing all of the necessary metadata to our analysis FastAPI backend. On two thirds of the screen (the center) will by default be taken up by the browser-in-browser, the left 1/6 should be an in-webapp markdown text editor where I can jot down notes, questions, requirement ideas, and comments about my interactions. The right 1/6 should use Graphviz as a flow chart to document all of my nested actions."

        triggers=[url_change, clicks, scroll(after scroll completion with 500ms delay), page appearance/element change]

        example="""
        See item
        Price
        Percentage off (deal)
        Delivery timeline
        Stars/reviews
        Num bought last month
        Title
        Image
        Buttons
        Add to cart
        Buy now
        Add protection plan (checkbox)
        Choose color (checkbox)
        Add to list
        Dropdown: choose list
        Clicked add to cart
        I didn’t select protection, but it prompted me to double check if I want to add protection to the order"""

        system_prompt_screen=

        structured_output="""
        list_of_possible_user_interactions
        for each val in list, create nested flowchart component with necessary button to process
        and possible user interaction tracing it on LOA down the interaction
        for one val in list where user did that user interaction:
        document what the user did

        BE CONCISE and format it for  Graphviz flowchart
        """

        interactions="User interactions should be documented sequentially and hireacrchially, using Graphviz to graphically show the nested user interactions. Refer to the documentation to show this, and refer to {example} for how to do this. Make an API call to Gemini's gemini-3-pro-preview. Refer to our backend {trggers} to determine when to capture a screenshot, but that screenshot should be used to make a {structured_output} API call with {system_prompt__screen}."

        
```
--- BACKEND - FastAPI ---

### init.py
``` 
    def init():
        launch chromium instance
        if not exist:
            request browser permissions
            init(websocket for microphone and screen recording)
                init(wispr flow)
            console tracking
        else:
            pass
```
### data.py
```
    def analyze():
        page=self.browser-in-browser
        metadata=[clicks, taps, navigation, scrolling, form interactions, duration, hover patterns, copy, paste, search queries, filters applied, items viewed, change in page state, items viewed, cart actions, quantity changes, price changes, checkout flow]
        captured_metadata=[]
        triggers=[url_change, clicks, scroll(after scroll completion with 500ms delay), page appearance/element change]
        def detect(metadata):
            for all triggers on page:
                log all metadata from action in `actions.json` with timestamps
    
    def connect(current_graph):
        connect captured_metadata with graphviz graph
```
### mouse-movements.py
```
    def mouse_click(triggers):
        Hook into noVNC's mouse event handlers
        Intercept mouse move, click, scroll events before they're sent to VNC
        Log events with timestamps and coordinates
        Send event stream to Python backend (WebSocket or REST)
        Store/analyze in backend

### gemini-graphviz.py
```
    def graphviz():
        Graphviz Technical Flow:
        Gemini returns DOT notation string (graph definition language)
        Backend validates DOT syntax
        Backend renders DOT → SVG using Graphviz library
        Send SVG (or DOT) to frontend
        Frontend displays using React Graphviz component or raw SVG
    def gemini_reasoning():
        gemini should use reasoning and it should be moderate if that is a possible API parameter. Additionally, Gemini should try to interpert all of the user decisions and those should also be tracked in our ensted flowchart. Essentially, Gemini is attempting to capture all of the information that will allow the researcher to document all of the explict and implicit requirements on the page. 
    def gemini_no_vnc():
        Capture VNC framebuffer → Get raw screen data from VNC server
        Convert to image → Transform framebuffer to PNG/JPEG
        Send to Gemini → Multimodal API call with screenshot + prompt
        Get structured output → Gemini returns Graphviz-formatted flowchart data
        Generate Graphviz → Create/update graph from Gemini's response
        Push to frontend → WebSocket sends updated graph to React
        Requirements Analysis
        Python Libraries Needed:
        vncdotool or Pillow + python-vnc-viewer - VNC framebuffer capture
        google-generativeai - Gemini API SDK
        graphviz - Generate graph from DOT notation
        fastapi + websockets - WebSocket connection to frontend
        Pillow (PIL) - Image manipulation
        Data Flow:
        Trigger event (click, scroll, URL change) → captured by frontend
        Backend receives trigger via WebSocket
        Backend captures VNC screenshot
        Screenshot + metadata → Gemini API
        Gemini returns structured Graphviz DOT notation
        Backend generates graph image/data
        WebSocket pushes to frontend React component
```

Test cases:
Ensure noVNC works
Test Gemini API calls
Test mouse and screenshot functions
Ensure fronted follows al constraints
Minimal code
One readme file under 50 lines telling me how to set up docker, our backend, and our frontend
Page doesnt reload on every get request from gemini (well from our backend which is from gemini). instead, it is just upserted to the flowchart.
no linter errors
Most current docs for all libraries and APIs are consulted