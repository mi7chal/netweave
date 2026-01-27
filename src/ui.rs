use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
#[serde(tag = "type", content = "content")] // Tagging for easier JS/JSON handling if needed later
pub enum FieldType {
    Text,
    Number,
    Url,
    Password,
    Select,
    Checkbox,
    Hidden,
    Textarea,
}

#[derive(Serialize, Clone, Debug)]
pub struct SelectOption {
    pub value: String,
    pub label: String,
    pub selected: bool,
}

#[derive(Serialize, Clone, Debug)]
pub struct FormField {
    pub label: String,
    pub name: String,
    pub field_type: FieldType,
    pub required: bool,
    // Value for text/number/url inputs
    pub value: Option<String>,
    pub placeholder: Option<String>,
    // Options for select inputs
    pub options: Vec<SelectOption>,
    // Checked state for checkbox
    pub checked: bool,
}

impl FormField {
    pub fn text(name: &str, label: &str) -> Self {
        Self::new(name, label, FieldType::Text)
    }

    pub fn number(name: &str, label: &str) -> Self {
        Self::new(name, label, FieldType::Number)
    }

    pub fn checkbox(name: &str, label: &str) -> Self {
        Self::new(name, label, FieldType::Checkbox)
    }

    pub fn select(name: &str, label: &str, options: Vec<(String, String)>) -> Self {
        let opts = options
            .into_iter()
            .map(|(v, l)| SelectOption {
                value: v,
                label: l,
                selected: false,
            })
            .collect();

        Self {
            options: opts,
            ..Self::new(name, label, FieldType::Select)
        }
    }

    pub fn new(name: &str, label: &str, kind: FieldType) -> Self {
        Self {
            label: label.to_string(),
            name: name.to_string(),
            field_type: kind,
            required: false,
            value: None,
            placeholder: None,
            options: vec![],
            checked: false,
        }
    }

    pub fn required(mut self) -> Self {
        self.required = true;
        self
    }

    pub fn placeholder(mut self, text: &str) -> Self {
        self.placeholder = Some(text.to_string());
        self
    }

    pub fn checked(mut self, is_checked: bool) -> Self {
        self.checked = is_checked;
        self
    }
}

// --- TABLE COMPONENTS ---

#[derive(Serialize, Clone, Debug)]
pub enum CellType {
    Text(String),
    Link {
        text: String,
        url: String,
        target_blank: bool,
    },
    Badge {
        text: String,
        style_class: String,
    }, // "badge public", "badge private", etc
    Actions {
        delete_url: String,
    },
}

#[derive(Serialize, Clone, Debug)]
pub struct TableRow {
    pub cells: Vec<CellType>,
}

#[derive(Serialize, Clone, Debug)]
pub struct TableView {
    pub headers: Vec<String>,
    pub rows: Vec<TableRow>,
}

impl TableView {
    pub fn new(headers: Vec<&str>, rows: Vec<TableRow>) -> Self {
        Self {
            headers: headers.into_iter().map(|s| s.to_string()).collect(),
            rows,
        }
    }

    pub fn from_display<T: TableDisplay>(items: Vec<T>) -> Self {
        Self {
            headers: T::table_headers(),
            rows: items.iter().map(|item| item.table_row()).collect(),
        }
    }
}

// --- DETAIL VIEW STRUCTURES ---

#[derive(Serialize, Clone, Debug)]
pub struct DetailProperty {
    pub label: String,
    pub value: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct DetailSection {
    pub title: String,
    pub table: TableView,
    pub add_new_link: Option<String>,
    pub add_button_label: Option<String>,
}

pub trait FormSchema {
    fn form_title() -> String;
    fn form_action() -> String;
    fn form_fields() -> Vec<FormField>;
}

pub trait TableDisplay {
    fn table_headers() -> Vec<String>;
    fn table_row(&self) -> TableRow;
}
