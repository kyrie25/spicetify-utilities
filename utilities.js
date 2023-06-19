(async function Utilities() {
    const { Platform, AppTitle, Mousetrap } = Spicetify;
    if (!Platform || !AppTitle || !Mousetrap) {
        setTimeout(Utilities, 100);
        return;
    }

    let config, listener, interval;
    try {
        config = JSON.parse(localStorage.getItem("utilities:config") || "{}");
    } catch {
        config = {
            reload: false,
            devtools: false,
            apptitle: "",
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

    function createInput(name, desc, defaultVal, onChange) {
        // Init
        defaultVal = config[name] ?? defaultVal;
        onChange(defaultVal);

        const container = document.createElement("div");
        container.classList.add("setting-row");
        container.id = name;
        container.innerHTML = `
  <label class="col description">${desc}</label>
  <div class="col action"><input type="text" value="${defaultVal}"></div>`;
        const input = container.querySelector("input");
        input.onchange = () => {
            config[name] = input.value;
            saveConfig();
            onChange(input.value);
            console.log(config);
        };
        return container;
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

    // Enable DevTools
    container.appendChild(
        createSlider("devtools", "Enable DevTools (takes effect after restart)", false, async (state) => {
            if (state) {
                await Spicetify.Platform.UserAPI._product_state.putOverridesValues({
                    pairs: { "app-developer": "2" },
                });
                listener = Spicetify.Platform.UserAPI._product_state.subValues({ keys: ["app-developer"] }, () => {
                    Spicetify.Platform.UserAPI._product_state.putOverridesValues({
                        pairs: { "app-developer": "2" },
                    });
                });
            } else {
                listener?.cancel();
                await Spicetify.Platform.UserAPI._product_state.putOverridesValues({
                    pairs: { "app-developer": "0" },
                });
            }
        })
    );

    // Change AppTitle
    container.appendChild(
        createInput("apptitle", "Change client title", await Spicetify.AppTitle.get(), (state) => {
            if (!state) {
                clearInterval(interval);
                Spicetify.AppTitle.reset();
            } else {
                interval = setInterval(() => Spicetify.AppTitle.set(state), 6000);
            }
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
