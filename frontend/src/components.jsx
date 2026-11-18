export function Campo({ label, erro, ...props }) {
  return (
    <label className="campo">
      <span>{label}</span>
      {props.as === 'select' ? <select {...props}>{props.children}</select> : <input {...props} />}
      {erro && <small className="erro">{erro}</small>}
    </label>
  );
}
export const Alerta = ({ msg }) => (msg ? <div className="alerta">{msg}</div> : null);
export const moeda = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
