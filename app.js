new Vue({
    el: '#app',
    data: {
        pagina: 'inicio', // Control de navegación SPA
        nuevaTarea: '',
        tareas: [],
        error: '',
        confirmarIndex: null,
        editandoIndex: null,
        textoEditado: '',
        filtro: 'todas',
        notificacion: '',
        temaOscuro: false,
        busqueda: '',
        orden: 'fecha',
        nuevaPrioridad: 'media',
        nuevaFecha: '',
        nuevaDescripcion: '',
        nuevaImagen: '',
        nuevaSubtarea: '',
        subtareasTemp: [],
        editandoSubtarea: null,
        editandoDescripcion: '',
        editandoFecha: '',
        editandoPrioridad: '',
        editandoImagen: '',
        editandoSubtareas: [],
    },
    mounted() {
        const guardadas = localStorage.getItem('tareas');
        if (guardadas) {
            this.tareas = JSON.parse(guardadas);
        }
        const tema = localStorage.getItem('temaOscuro');
        if (tema) {
            this.temaOscuro = tema === 'true';
            document.body.classList.toggle('dark-mode', this.temaOscuro);
        }
    },
    watch: {
        tareas: {
            handler(val) {
                localStorage.setItem('tareas', JSON.stringify(val));
            },
            deep: true
        },
        temaOscuro(val) {
            localStorage.setItem('temaOscuro', val);
            document.body.classList.toggle('dark-mode', val);
        }
    },
    computed: {
        tareasFiltradas() {
            let tareas = this.tareas;
            if (this.busqueda) {
                const b = this.busqueda.toLowerCase();
                tareas = tareas.filter(t => t.texto.toLowerCase().includes(b) || (t.descripcion && t.descripcion.toLowerCase().includes(b)));
            }
            if (this.filtro === 'completadas') tareas = tareas.filter(t => t.completada);
            if (this.filtro === 'pendientes') tareas = tareas.filter(t => !t.completada);
            if (this.orden === 'fecha') tareas = tareas.slice().sort((a, b) => (a.fecha || '') > (b.fecha || '') ? 1 : -1);
            if (this.orden === 'prioridad') tareas = tareas.slice().sort((a, b) => (b.prioridad || 'media').localeCompare(a.prioridad || 'media'));
            return tareas;
        },
        total() { return this.tareas.length; },
        completadas() { return this.tareas.filter(t => t.completada).length; },
        pendientes() { return this.tareas.filter(t => !t.completada).length; }
    },
    methods: {
        agregarTarea() {
            const texto = this.nuevaTarea.trim();
            if (!texto) {
                this.mostrarNotificacion('Por favor, escribe una tarea.', true);
                return;
            }
            this.tareas.push({
                id: Date.now() + Math.random(),
                texto,
                completada: false,
                prioridad: this.nuevaPrioridad,
                fecha: this.nuevaFecha,
                descripcion: this.nuevaDescripcion,
                imagen: this.nuevaImagen,
                subtareas: this.subtareasTemp.map(s => ({ texto: s, completada: false }))
            });
            this.nuevaTarea = '';
            this.nuevaPrioridad = 'media';
            this.nuevaFecha = '';
            this.nuevaDescripcion = '';
            this.nuevaImagen = '';
            this.subtareasTemp = [];
            this.mostrarNotificacion('Tarea agregada correctamente.');
        },
        subirImagen(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e2 => {
                this.nuevaImagen = e2.target.result;
            };
            reader.readAsDataURL(file);
        },
        agregarSubtarea() {
            if (this.nuevaSubtarea.trim()) {
                this.subtareasTemp.push(this.nuevaSubtarea.trim());
                this.nuevaSubtarea = '';
            }
        },
        eliminarSubtareaTemp(idx) {
            this.subtareasTemp.splice(idx, 1);
        },
        confirmarEliminacion(index) {
            this.confirmarIndex = index;
            // Asegurarse de que el modal se muestre correctamente
            if (this.$refs.modal) {
                // Si ya hay un modal abierto, ciérralo primero
                try {
                    const oldModal = bootstrap.Modal.getInstance(this.$refs.modal);
                    if (oldModal) oldModal.hide();
                } catch(e){}
                setTimeout(() => {
                    const modal = new bootstrap.Modal(this.$refs.modal);
                    modal.show();
                }, 100);
            }
        },
        eliminarTarea(index) {
            this.tareas.splice(index, 1);
            this.confirmarIndex = null;
            // Cerrar modal y limpiar overlay si queda
            if (this.$refs.modal) {
                const modal = bootstrap.Modal.getInstance(this.$refs.modal);
                if (modal) modal.hide();
            }
            document.body.classList.remove('modal-open');
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(b => b.remove());
            this.mostrarNotificacion('Tarea eliminada.');
        },
        completarTarea(index) {
            this.tareas[index].completada = !this.tareas[index].completada;
            this.mostrarNotificacion(this.tareas[index].completada ? '¡Tarea completada!' : 'Tarea marcada como pendiente.');
        },
        editarTarea(index) {
            this.editandoIndex = index;
            const t = this.tareas[index];
            this.textoEditado = t.texto;
            this.editandoDescripcion = t.descripcion || '';
            this.editandoFecha = t.fecha || '';
            this.editandoPrioridad = t.prioridad || 'media';
            this.editandoImagen = t.imagen || '';
            this.editandoSubtareas = t.subtareas ? t.subtareas.map(s => ({ ...s })) : [];
        },
        guardarEdicion(index) {
            const texto = this.textoEditado.trim();
            if (!texto) {
                this.mostrarNotificacion('El texto no puede estar vacío.', true);
                return;
            }
            const t = this.tareas[index];
            t.texto = texto;
            t.descripcion = this.editandoDescripcion;
            t.fecha = this.editandoFecha;
            t.prioridad = this.editandoPrioridad;
            t.imagen = this.editandoImagen;
            t.subtareas = this.editandoSubtareas.map(s => ({ ...s }));
            this.editandoIndex = null;
            this.textoEditado = '';
            this.mostrarNotificacion('Tarea editada correctamente.');
        },
        cancelarEdicion() {
            this.editandoIndex = null;
            this.textoEditado = '';
        },
        cambiarFiltro(f) {
            this.filtro = f;
        },
        cambiarOrden(o) {
            this.orden = o;
        },
        vaciarLista() {
            if (confirm('¿Seguro que deseas eliminar todas las tareas?')) {
                this.tareas = [];
                this.mostrarNotificacion('Todas las tareas han sido eliminadas.');
            }
        },
        mostrarNotificacion(msg, error = false) {
            this.notificacion = msg;
            setTimeout(() => { this.notificacion = ''; }, 2500);
        },
        alternarTema() {
            this.temaOscuro = !this.temaOscuro;
        },
        subirImagenEdicion(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e2 => {
                this.editandoImagen = e2.target.result;
            };
            reader.readAsDataURL(file);
        },
        agregarSubtareaEdicion() {
            if (this.nuevaSubtarea.trim()) {
                this.editandoSubtareas.push({ texto: this.nuevaSubtarea.trim(), completada: false });
                this.nuevaSubtarea = '';
            }
        },
        eliminarSubtareaEdicion(idx) {
            this.editandoSubtareas.splice(idx, 1);
        },
        completarSubtarea(tareaIdx, subIdx) {
            this.tareas[tareaIdx].subtareas[subIdx].completada = !this.tareas[tareaIdx].subtareas[subIdx].completada;
        },
        cerrarModalEliminar() {
            if (this.$refs.modal) {
                const modal = bootstrap.Modal.getInstance(this.$refs.modal);
                if (modal) modal.hide();
            }
            document.body.classList.remove('modal-open');
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(b => b.remove());
            this.confirmarIndex = null;
        }
    }
}); 