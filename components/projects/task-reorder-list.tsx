'use client';

import { useState, useEffect } from 'react';
import { Reorder } from 'framer-motion';
import { Task } from '@prisma/client';
import { TaskItem } from './task-item';
import { cn } from '@/lib/utils';
import { updateTasksOrder } from '@/app/(dashboard)/projects/actions';
import { toast } from 'sonner';

interface TaskReorderListProps {
  initialTasks: Task[];
  viewMode: 'list' | 'grid' | 'compact';
}

export function TaskReorderList({ initialTasks, viewMode }: TaskReorderListProps) {
  // Estado local para permitir atualização instantânea da UI (Optimistic Update)
  const [tasks, setTasks] = useState(initialTasks);

  // Sincroniza se os dados chegarem atualizados do banco (ex: outra aba ou nova tarefa criada)
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleReorder = async (newOrder: Task[]) => {
    // 1. Pega os IDs antes e depois para checar se a ordem REALMENTE mudou
    const oldIds = tasks.map(t => t.id).join(',');
    const newIds = newOrder.map(t => t.id).join(',');

    // Atualiza a tela instantaneamente para o usuário
    setTasks(newOrder);

    // Se soltou no mesmo lugar, não gasta requisição de banco de dados
    if (oldIds === newIds) return;

    // 2. Manda salvar em background
    const idsToUpdate = newOrder.map(t => t.id);
    const result = await updateTasksOrder(idsToUpdate);
    
    // 3. Se o banco falhar, reverte a animação na tela e avisa o usuário
    if (result?.error) {
      toast.error(result.error);
      setTasks(initialTasks);
    }
  };

  return (
    <Reorder.Group
      // Para o Framer Motion, mesmo em Grid, a ordem lógica do DOM é sempre linear (eixo Y).
      // Forçar 'axis="y"' estabiliza a matemática de colisão dos cards.
      axis="y"
      values={tasks}
      onReorder={handleReorder}
      className={cn(
        "w-full outline-none list-none p-0 m-0",
        viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6" 
            : "flex flex-col gap-3"
      )}
    >
      {tasks.map((task) => (
        // IMPORTANTE: Nós NÃO embrulhamos com <Reorder.Item> aqui!
        // O TaskGridItem, TaskListItem e TaskCompactItem já fazem isso lá dentro deles.
        <TaskItem 
          key={task.id} 
          task={task} 
          viewMode={viewMode} 
        />
      ))}
    </Reorder.Group>
  );
}