(async function Utilities() {
    const { Platform, AppTitle, Mousetrap } = Spicetify;
    if (!Platform || !AppTitle || !Mousetrap) {
        setTimeout(Utilities, 100);
        return;
    }

    let config, titleInterval, listener;
    try {
        config = JSON.parse(localStorage.getItem("utilities:config") || "{}");
    } catch {
        config = {
            reload: false,
            devtools: false,
            apptitle: "",
            stop: false,
        };
    }

    function saveConfig() {
        localStorage.setItem("utilities:config", JSON.stringify(config));
    }

    const container = document.createElement("div");
    container.id = "utilities";

    const style = document.createElement("style");
    style.innerHTML = `.setting-row::after {
          content: "";
          display: table;
          clear: both;
      }
      .setting-row + span {
          font-size: 0.825rem;
      }
      .setting-row .col {
          padding: 16px 0 4px;
          align-items: center;
      }
      .setting-row .col.description {
          float: left;
          padding-right: 15px;
          cursor: default;
      }
      .setting-row .col.action {
          float: right;
          display: flex;
          justify-content: flex-end;
          align-items: center;
      }
      .setting-row .col.action input {
          width: 100%;
          margin-top: 10px;
          padding: 0 5px;
          height: 32px;
          border: 0;
          color: var(--spice-text);
          background-color: initial;
          border-bottom: 1px solid var(--spice-text);
      }
      button.switch {
          align-items: center;
          border: 0px;
          border-radius: 50%;
          background-color: rgba(var(--spice-rgb-shadow), 0.7);
          color: var(--spice-text);
          cursor: pointer;
          margin-inline-start: 12px;
          padding: 8px;
          width: 32px;
          height: 32px;
      }
      button.switch.disabled,
      button.switch[disabled] {
          color: rgba(var(--spice-rgb-text), 0.3);
      }
      button.switch.small {
          width: 22px;
          height: 22px;
          padding: 3px;
      }
      button.btn {
          font-weight: 700;
          font-size: medium;
          background-color: transparent;
          border-radius: 500px;
          transition-duration: 33ms;
          transition-property: background-color, border-color, color, box-shadow, filter, transform;
          padding-inline: 15px;
          border: 1px solid #727272;
          color: var(--spice-text);
          min-block-size: 32px;
          cursor: pointer;
      }
      button.btn:hover {
          transform: scale(1.04);
          border-color: var(--spice-text);
      }`;
    container.appendChild(style);

    function createSlider(name, desc, defaultVal, onChange) {
        // Init
        defaultVal = config[name] ?? defaultVal;
        onChange(defaultVal);

        const container = document.createElement("div");
        container.classList.add("setting-row");
        container.id = name;
        container.innerHTML = `
  <label class="col description">${desc}</label>
  <div class="col action"><button class="switch">
      <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
          ${Spicetify.SVGIcons.check}
      </svg>
  </button></div>`;

        const slider = container.querySelector("button.switch");
        slider.classList.toggle("disabled", !defaultVal);

        slider.onclick = () => {
            const state = slider.classList.contains("disabled");
            slider.classList.toggle("disabled");
            config[name] = state;
            saveConfig();
            onChange(state);
            console.log(config);
        };

        return container;
    }

    async function setTitle(title) {
        await Spicetify.AppTitle.reset();
        Spicetify.AppTitle.set(title);
    }

    function createInput(name, desc, defaultVal, onChange) {
        // Init
        value = config[name] ?? defaultVal;
        onChange(value);

        const container = document.createElement("div");
        container.classList.add("setting-row");
        container.id = name;
        container.innerHTML = `
  <label class="col description">${desc}</label>
  <div class="col action"><input type="text" value="${value}" placeholder="${defaultVal}"></div>`;
        const input = container.querySelector("input");
        input.onchange = () => {
            config[name] = input.value;
            saveConfig();
            onChange(input.value);
            console.log(config);
        };
        return container;
    }

    function createButton(name, desc, onclick) {
        const button = document.createElement("div");
        button.classList.add("setting-row");
        button.id = "reset";
        button.innerHTML += `
          <label class="col description">${desc}</label>
          <div class="col action">
            <button class="btn">${name}</button>
          </div>`;
        const btn = button.querySelector("button.btn");
        btn.onclick = onclick;
        return button;
    }

    // Reload keybind
    container.appendChild(
        createSlider("reload", "Reload Spotify with F5 (browser-style)", false, (state) => {
            if (state) {
                Mousetrap.bind("f5", () => {
                    window.location.reload();
                });
            } else Mousetrap.unbind("f5");
        })
    );

    // Stop keybind
    container.appendChild(
        createSlider("stop", "Stop Spotify execution with F8 (requires opened DevTools window)", false, (state) => {
            if (state) {
                Mousetrap.bind("f8", () => {
                    debugger;
                });
            } else Mousetrap.unbind("f8");
        })
    );

    // Enable DevTools
    container.appendChild(
        createSlider("devtools", "Enable DevTools (takes effect after restart)", false, async (state) => {
            const productState = Spicetify.Platform.UserAPI._product_state || Spicetify.Platform.UserAPI._product_state_service;
            if (state) {
                // `putOverridesValues` self-resets after a long period of time for unknown reasons
                await productState.putValues({
                    pairs: { "app-developer": "2" },
                });
                listener = productState.subValues({ keys: ["app-developer"] }, () => {
                    productState.putValues({
                        pairs: { "app-developer": "2" },
                    });
                });
            } else {
                listener?.cancel();
                await productState.putValues({
                    pairs: { "app-developer": "0" },
                });
            }
        })
    );

    // Change AppTitle
    container.appendChild(
        createInput("apptitle", "Change client title", await Spicetify.AppTitle.get(), (state) => {
            console.log(state);
            if (!state) {
                clearInterval(titleInterval);
                Spicetify.AppTitle.reset();
            } else {
                Spicetify.AppTitle.set(state);
                titleInterval = setInterval(setTitle, 5000, state);
            }
        })
    );

    // Reload Spotify
    container.appendChild(
        createButton("Reload", "Reload Spotify", () => {
            window.location.reload();
        })
    );

    // Restart Spotify
    container.appendChild(
        createButton("Restart", "Restart Spotify", () => {
            Spicetify.Platform.UpdateAPI.applyUpdate();
        })
    );

    new Spicetify.Menu.Item("Utilities", false, () => {
        Spicetify.PopupModal.display({
            title: "Utilities",
            content: container,
            isLarge: true,
        });
    }).register();
})();
