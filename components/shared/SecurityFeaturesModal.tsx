import React from 'react';
import Modal from './Modal';
import { ArchiveBoxIcon } from '../icons/ArchiveBoxIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { ScaleIcon } from '../icons/ScaleIcon';
import { ClipboardDocumentListIcon } from '../icons/ClipboardDocumentListIcon';
import { LockClosedIcon } from '../icons/LockClosedIcon';

interface FeatureProps {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, children }) => (
    <div className="flex items-start space-x-4 space-x-reverse">
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-500 dark:text-blue-400">
            {icon}
        </div>
        <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
                {children}
            </p>
        </div>
    </div>
);


const SecurityFeaturesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="أمان وخصوصية بياناتك" size="4xl">
      <div className="space-y-8 p-4">
        <Feature icon={<ArchiveBoxIcon className="w-7 h-7" />} title="لا يوجد حذف نهائي (الأمان ضد الأخطاء)">
            أهم ميزة أمان في نظامنا هي أنه لا يمكن حذف أي شيء بشكل دائم. بدلاً من الحذف، يتم "أرشفة" البيانات. هذا يعني أنه إذا قمت بأرشفة فاتورة أو عميل عن طريق الخطأ، يمكنك استعادته فورًا من شاشة "الأرشيف". بياناتك لا تُفقد أبدًا.
        </Feature>
        <Feature icon={<UsersIcon className="w-7 h-7" />} title="صلاحيات المستخدمين (التحكم في الوصول)">
            النظام يعتمد على أدوار وصلاحيات واضحة. العمليات الحساسة مثل تغيير الإعدادات، أو أرشفة البيانات، أو الاطلاع على سجل النشاط متاحة فقط لـ "مدير النظام". هذا يمنع المستخدمين غير المصرح لهم من إجراء تغييرات خطيرة.
        </Feature>
        <Feature icon={<ScaleIcon className="w-7 h-7" />} title="قواعد محاسبية صارمة">
            النظام يطبق قواعد تمنع الأخطاء المحاسبية. على سبيل المثال، لا يمكنك أرشفة عميل أو مورد إذا كان رصيده غير صفري، ولا يمكنك أرشفة منتج إذا كان لا يزال لديه كمية في المخزن. هذا يحافظ على دقة وسلامة حساباتك.
        </Feature>
        <Feature icon={<ClipboardDocumentListIcon className="w-7 h-7" />} title="سجل النشاط (الرقابة الكاملة)">
            كل إجراء مهم يتم في النظام، مثل إنشاء فاتورة، أو تعديل مستخدم، أو تغيير الإعدادات، يتم تسجيله في "سجل النشاط". هذا يوفر لك شفافية كاملة ويسمح لك بمعرفة من قام بكل إجراء ومتى تم.
        </Feature>
        <Feature icon={<LockClosedIcon className="w-7 h-7" />} title="التخزين المحلي (الخصوصية)">
            يتم حفظ جميع بياناتك مباشرة داخل متصفح الإنترنت على جهاز الكمبيوتر الخاص بك. هي ليست مخزنة على الإنترنت أو على أي خادم خارجي. هذا يعني أنك الشخص الوحيد الذي يمكنه الوصول إليها، مما يمنحك أعلى مستوى من الخصوصية والأمان.
        </Feature>
      </div>
      <div className="mt-6 flex justify-end p-4 border-t dark:border-gray-700">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          فهمت
        </button>
      </div>
    </Modal>
  );
};

export default SecurityFeaturesModal;