import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const translations = { perform_action: 'Perform an Action' };

	function t(key) {
		return translations[key] || `{{${key}}}`;
	}

	let actionTransKey = $.fallback($$props['actionTransKey'], 'perform_action');

	function tooltip(node, text) {
		let tooltip = null;

		function onMouseEnter() {
			tooltip = document.createElement('div');
			tooltip.classList.add('tooltip');
			tooltip.textContent = text;
			node.parentNode.appendChild(tooltip);
		}

		function onMouseLeave() {
			if (!tooltip) return;

			tooltip.remove();
			tooltip = null;
		}

		node.addEventListener('mouseenter', onMouseEnter);
		node.addEventListener('mouseleave', onMouseLeave);

		return {
			destroy() {
				node.removeEventListener('mouseenter', onMouseEnter);
				node.removeEventListener('mouseleave', onMouseLeave);
			}
		};
	}

	$$renderer.push(`<button>action</button>`);
	$.bind_props($$props, { actionTransKey });
}