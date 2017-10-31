#include "CommandLineParams.h"
#include "interfaces/components/TabbedComponent.h"
#include "interfaces/components/InputComponent.h"
#include "environment/Environment.h"
#include "Log.h"
#include "URL.h"
#include "WebResource.h"
#include "tlsf.h"
#include "CFGFileParser.h"
#include "browser.h"

#include "interfaces/graphical/renderers/glfw/opengl.h"
#include "parsers/images/netpbm/pnm.h"

#include <ctime>
#include <iostream>
#include <sys/stat.h>
#include <string.h>

#ifdef _WIN32
extern "C"{
    void init_heap();
}
#endif

#if defined(_WIN32) && !defined(_WIN64)
#define PLATFORM "i686-pc-winnt"
#endif
#ifdef _WIN64
#define PLATFORM "amd64-pc-winnt"
#endif

// global
// to remove this
// window uses this to make windows and get window count (can be just be passed in when creating a window)
// AElement uses it to getActiveDocumentComponent and navTo on that
//
std::unique_ptr<Browser> browser = nullptr;
std::unique_ptr<BaseRenderer> renderer = nullptr;

// forward declaration
bool isAbsolutePath(const std::string s);
bool fileExists(const std::string s);

bool isAbsolutePath(const std::string s) {
    return (s.length() > 0 && s[0] == '/');
}

bool fileExists(const std::string s) {
    struct stat buf;
    return stat(s.c_str(), &buf) != -1;
}

extern TextRasterizerCache *rasterizerCache;

int main(int argc, char *argv[]) {
    // show help msg when "--help" appears
    if (argc > 1) {
        // has to be set up for logging before first logging call
        initCLParams(argc, argv);
        if (strcmp(argv[1], "--help")==0) {
            std::cout << "./netrunner [http://host.tld/|/path/to/file.html] [-log <error|warning|notice|info|debug>]" << std::endl;
            return 1;
        }
    }
#ifdef _WIN32
    init_heap(); // the NT port requires it. We do it at startup now, to allow 2LSF to run at any time
#endif

    std::cout \
    << "#     #                 ######" << std::endl \
    << "##    #  ######   ##### #     #  #    #  #    #  #    #  ######  #####" << std::endl \
    << "# #   #  #          #   #     #  #    #  ##   #  ##   #  #       #    #" << std::endl \
    << "#  #  #  #####      #   ######   #    #  # #  #  # #  #  #####   #    #" << std::endl \
    << "#   # #  #          #   #   #    #    #  #  # #  #  # #  #       #####" << std::endl \
    << "#    ##  #          #   #    #   #    #  #   ##  #   ##  #       #   #" << std::endl \
    << "#     #  ######     #   #     #   ####   #    #  #    #  ######  #    #" << std::endl;

#if defined(VERSION) && defined(PLATFORM)
    std::cout << "/g/ntr - NetRunner build " << __DATE__ << ": rev-" << VERSION << " for " << PLATFORM << std::endl;
#else
    std::cout << "/g/ntr - NetRunner build " << __DATE__ << ": internal-dev non-Makefile build" << std::endl;
#endif

    
    Environment::init();
    CFGFileParser *parser = new CFGFileParser("res/netrunner.cfg");
    BrowserConfiguration *config = new BrowserConfiguration();
    if (!parser) {
        std::cout << "no parser!" << std::endl;
    }
    if (parser->ParseText()){
        parser->WriteConfig(*config);
    }
    delete parser;
    #ifdef DEBUG
    std::cout << "Global Settings contains, in no particular order:\n";
    for ( auto it = config->Settings.begin(); it != config->Settings.end(); ++it ){
        std::cout << it->first << ":" << it->second << std::endl;
    }
    std::cout << std::endl;
    #endif
    
    renderer = std::make_unique<OpenGL>();

	//Environment::init();
    
    renderer->initialize();
    
    /*
    Rect pos;
    pos.x=0;
    pos.y=0;
    pos.w=1024;
    pos.h=640;
    OpenGLWindowHandle *win = renderer.createWindow("NTR", &pos, 0);
    if (!win) {
        std::cout << "Couldn't create window" << std::endl;
        return 0;
    }
    
    OpenGLTexture *blue = win->createSpriteFromColor(0x0000FFFF);
    if (!blue) {
        std::cout << "Couldn't create blue" << std::endl;
        return 0;
    }
    Rect dPos = { 0, 0, 512, 320 };
     */
    
    /*
    const std::shared_ptr<TextRasterizer> textRasterizer = rasterizerCache->loadFont(12, false);
    rasterizationRequest request;
    request.text = "Hello World";
    request.startX = 512;
    request.availableWidth = 1024;
    request.maxTextureSize = 16384;
    request.noWrap = true;
    //std::cout << "rasterizing [" << text << "] @" << rawX << " availableWidth: " << availableWidth << " sourceStartX: " << rasterStartX << " noWrap: " << noWrap << std::endl;
    std::shared_ptr<rasterizationResponse> response = textRasterizer->rasterize(request);
    
    textureMap textureMap;
    textureMap.map[0] = response->s0;
    textureMap.map[1] = response->t0;
    textureMap.map[2] = response->s1;
    textureMap.map[3] = response->t1;
    
    OpenGLTexture *text = win->createTextSprite(response->textureData.get(), response->textureWidth, response->textureHeight, textureMap);
    Rect dPos3 = { 512, 320, 512, 320};
     */
    
    /*
    RGBAPNMObject *anime = readPPM("kon32_661.pam");
    if (!anime) {
        std::cout << "Couldn't load image" << std::endl;
        return 0;
    }
     opengl_texture_handle *red = win->createSprite(anime->m_Ptr, anime->width, anime->height);
     Rect dPos2 = { 512, 320, 512, 320};
    */
    
    /*
    win->clear();
    win->drawSpriteBox(blue, &dPos);
    win->drawSpriteText(text, 0x000000FF, &dPos3);
    //win->drawSpriteBox(red, &dPos2);
    win->swapBuffers();

    while(1) {
        glfwWaitEvents(); // block until something changes
    }
    
    return 0;
    */

    // we need to set up OGL before we can setDOM (because component can't be constructed (currently) without OGL)
    // but should be after CommandLineParams incase we need to change some type of window config
    browser = std::make_unique<Browser>();
    browser->addWindow();
    if (!browser->windows.front().get()->window) {
        return 1;
    }

    //std::cout << "argc " << argc << std::endl;
    if (argc > 1) {
        // this isn't going to work
        std::string rawUrl = getCLParamByIndex(1);
        if (rawUrl != "-log") {
            // if we do this here, shouldn't we do this in parseUri too?
            if (rawUrl.find("://") == rawUrl.npos) {
                // Path should always be absolute for file://
                if (isAbsolutePath(rawUrl)) {
                    rawUrl = "file://" + rawUrl;
                } else {
                    auto absolutePath = std::string(getenv("PWD")) + '/' + rawUrl;
                    if (fileExists(absolutePath)) {
                        rawUrl = "file://" + absolutePath;
                    } else {
                        // Default to http if the file wasn't found
                        rawUrl = "http://" + rawUrl;
                    }
                }
            }
            //logDebug() << "pre URL parse [" << url << "]" << std::endl;
            //window->currentURL = URL(rawUrl);
            logDebug() << "loading [" << rawUrl << "]" << std::endl;
            TabbedComponent *tabComponent = dynamic_cast<TabbedComponent*>(browser->windows.front().get()->tabComponent.get());
            if (tabComponent) {
                tabComponent->addTab("Start Tab, Loading...");
                tabComponent->selectTab(tabComponent->tabs.front());
                // render the loading label, before we block for loading
                browser->render();
            }
            /*
            if (!setWindowContent(window->currentURL)) {
                return 1;
            }
            */
            std::shared_ptr<DocumentComponent> docComponent = browser->getActiveDocumentComponent();
            if (docComponent) {
                // now tell it to navigate somewhere
                docComponent->navTo(rawUrl);
            }
        } else {
            // be nice if we could put http:// in the address bar
        }
    }
    
    browser->loop();
    return 0;
}
