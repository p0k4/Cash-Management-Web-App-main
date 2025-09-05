--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13 (Debian 15.13-0+deb12u1)
-- Dumped by pg_dump version 17.0

-- Started on 2025-08-27 23:45:20 WEST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 16435)
-- Name: fecho_caixa; Type: TABLE; Schema: public; Owner: martins
--

CREATE TABLE public.fecho_caixa (
    id integer NOT NULL,
    data date NOT NULL,
    hora time without time zone DEFAULT CURRENT_TIME NOT NULL,
    total_dinheiro numeric(10,2),
    total_multibanco numeric(10,2),
    total_transferencia numeric(10,2),
    total_geral numeric(10,2),
    user_id integer NOT NULL
);


ALTER TABLE public.fecho_caixa OWNER TO martins;

--
-- TOC entry 221 (class 1259 OID 16434)
-- Name: fecho_caixa_id_seq; Type: SEQUENCE; Schema: public; Owner: martins
--

CREATE SEQUENCE public.fecho_caixa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fecho_caixa_id_seq OWNER TO martins;

--
-- TOC entry 3395 (class 0 OID 0)
-- Dependencies: 221
-- Name: fecho_caixa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: martins
--

ALTER SEQUENCE public.fecho_caixa_id_seq OWNED BY public.fecho_caixa.id;


--
-- TOC entry 215 (class 1259 OID 16390)
-- Name: registos; Type: TABLE; Schema: public; Owner: martins
--

CREATE TABLE public.registos (
    id integer NOT NULL,
    operacao text,
    data date,
    numdoc integer,
    pagamento text,
    valor numeric,
    op_tpa text,
    utilizador text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.registos OWNER TO martins;

--
-- TOC entry 214 (class 1259 OID 16389)
-- Name: registos_id_seq; Type: SEQUENCE; Schema: public; Owner: martins
--

CREATE SEQUENCE public.registos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registos_id_seq OWNER TO martins;

--
-- TOC entry 3396 (class 0 OID 0)
-- Dependencies: 214
-- Name: registos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: martins
--

ALTER SEQUENCE public.registos_id_seq OWNED BY public.registos.id;


--
-- TOC entry 220 (class 1259 OID 16417)
-- Name: saldos_diarios; Type: TABLE; Schema: public; Owner: martins
--

CREATE TABLE public.saldos_diarios (
    id integer NOT NULL,
    data date NOT NULL,
    dinheiro numeric(10,2) DEFAULT 0,
    multibanco numeric(10,2) DEFAULT 0,
    transferencia numeric(10,2) DEFAULT 0,
    total numeric(10,2) DEFAULT 0,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    montante_periodo numeric
);


ALTER TABLE public.saldos_diarios OWNER TO martins;

--
-- TOC entry 219 (class 1259 OID 16416)
-- Name: saldos_diarios_id_seq; Type: SEQUENCE; Schema: public; Owner: martins
--

CREATE SEQUENCE public.saldos_diarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saldos_diarios_id_seq OWNER TO martins;

--
-- TOC entry 3397 (class 0 OID 0)
-- Dependencies: 219
-- Name: saldos_diarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: martins
--

ALTER SEQUENCE public.saldos_diarios_id_seq OWNED BY public.saldos_diarios.id;


--
-- TOC entry 216 (class 1259 OID 16398)
-- Name: sequencias_doc; Type: TABLE; Schema: public; Owner: martins
--

CREATE TABLE public.sequencias_doc (
    utilizador text NOT NULL,
    ultimo_numdoc integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sequencias_doc OWNER TO martins;

--
-- TOC entry 218 (class 1259 OID 16406)
-- Name: utilizadores; Type: TABLE; Schema: public; Owner: martins
--

CREATE TABLE public.utilizadores (
    id integer NOT NULL,
    username text NOT NULL,
    senha text NOT NULL,
    role text DEFAULT 'user'::text
);


ALTER TABLE public.utilizadores OWNER TO martins;

--
-- TOC entry 217 (class 1259 OID 16405)
-- Name: utilizadores_id_seq; Type: SEQUENCE; Schema: public; Owner: martins
--

CREATE SEQUENCE public.utilizadores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.utilizadores_id_seq OWNER TO martins;

--
-- TOC entry 3398 (class 0 OID 0)
-- Dependencies: 217
-- Name: utilizadores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: martins
--

ALTER SEQUENCE public.utilizadores_id_seq OWNED BY public.utilizadores.id;


--
-- TOC entry 3229 (class 2604 OID 16438)
-- Name: fecho_caixa id; Type: DEFAULT; Schema: public; Owner: martins
--

ALTER TABLE ONLY public.fecho_caixa ALTER COLUMN id SET DEFAULT nextval('public.fecho_caixa_id_seq'::regclass);


--
-- TOC entry 3218 (class 2604 OID 16393)
-- Name: registos id; Type: DEFAULT; Schema: public; Owner: martins
--

ALTER TABLE ONLY public.registos ALTER COLUMN id SET DEFAULT nextval('public.registos_id_seq'::regclass);


--
-- TOC entry 3223 (class 2604 OID 16420)
-- Name: saldos_diarios id; Type: DEFAULT; Schema: public; Owner: martins
--

ALTER TABLE ONLY public.saldos_diarios ALTER COLUMN id SET DEFAULT nextval('public.saldos_diarios_id_seq'::regclass);


--
-- TOC entry 3221 (class 2604 OID 16409)
-- Name: utilizadores id; Type: DEFAULT; Schema: public; Owner: martins
--

ALTER TABLE ONLY public.utilizadores ALTER COLUMN id SET DEFAULT nextval('public.utilizadores_id_seq'::regclass);


--
-- TOC entry 3245 (class 2606 OID 16441)
-- Name: fecho_caixa fecho_caixa_pkey; Type: CONSTRAINT; Schema: public; Owner: martins
--

ALTER TABLE ONLY public.fecho_caixa
    ADD CONSTRAINT fecho_caixa_pkey PRIMARY KEY (id);


--
-- TOC entry 3234 (class 2606 OID 16397)
-- Name: registos registos_pkey; Type: CONSTRAINT; Schema: public; Owner: martins
--

ALTER TABLE ONLY public.registos
    ADD CONSTRAINT registos_pkey PRIMARY KEY (id);


--
-- TOC entry 3243 (class 2606 OID 16426)
-- Name: saldos_diarios saldos_diarios_pkey; Type: CONSTRAINT; Schema: public; Owner: martins
--

ALTER TABLE ONLY public.saldos_diarios
    ADD CONSTRAINT saldos_diarios_pkey PRIMARY KEY (id);


--
-- TOC entry 3236 (class 2606 OID 16404)
-- Name: sequencias_doc sequencias_doc_pkey; Type: CONSTRAINT; Schema: public; Owner: martins
--

ALTER TABLE ONLY public.sequencias_doc
    ADD CONSTRAINT sequencias_doc_pkey PRIMARY KEY (utilizador);


--
-- TOC entry 3238 (class 2606 OID 16413)
-- Name: utilizadores utilizadores_pkey; Type: CONSTRAINT; Schema: public; Owner: martins
--

ALTER TABLE ONLY public.utilizadores
    ADD CONSTRAINT utilizadores_pkey PRIMARY KEY (id);


--
-- TOC entry 3240 (class 2606 OID 16415)
-- Name: utilizadores utilizadores_username_key; Type: CONSTRAINT; Schema: public; Owner: martins
--

ALTER TABLE ONLY public.utilizadores
    ADD CONSTRAINT utilizadores_username_key UNIQUE (username);


--
-- TOC entry 3231 (class 1259 OID 16449)
-- Name: idx_registos_user_date; Type: INDEX; Schema: public; Owner: martins
--

CREATE INDEX idx_registos_user_date ON public.registos USING btree (utilizador, data);


--
-- TOC entry 3232 (class 1259 OID 16450)
-- Name: idx_registos_user_date_created; Type: INDEX; Schema: public; Owner: martins
--

CREATE INDEX idx_registos_user_date_created ON public.registos USING btree (utilizador, data, created_at);


--
-- TOC entry 3241 (class 1259 OID 16451)
-- Name: idx_saldos_user_date_created; Type: INDEX; Schema: public; Owner: martins
--

CREATE INDEX idx_saldos_user_date_created ON public.saldos_diarios USING btree (user_id, data, created_at);


--
-- TOC entry 3246 (class 2606 OID 16429)
-- Name: saldos_diarios fk_user; Type: FK CONSTRAINT; Schema: public; Owner: martins
--

ALTER TABLE ONLY public.saldos_diarios
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.utilizadores(id) ON DELETE CASCADE;


--
-- TOC entry 3247 (class 2606 OID 16442)
-- Name: fecho_caixa fk_user_fecho; Type: FK CONSTRAINT; Schema: public; Owner: martins
--

ALTER TABLE ONLY public.fecho_caixa
    ADD CONSTRAINT fk_user_fecho FOREIGN KEY (user_id) REFERENCES public.utilizadores(id) ON DELETE CASCADE;


-- Completed on 2025-08-27 23:45:21 WEST

--
-- PostgreSQL database dump complete
--

